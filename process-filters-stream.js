const mongoose = require('mongoose');
const Product = require('./models/Product.js');
const Filter = require('./models/Filter.js');
require('dotenv').config();

class FiltersStreamProcessor {
    constructor() {
        this.stats = {
            totalProducts: 0,
            processedProducts: 0,
            totalSections: 0,
            totalFilters: 0,
            savedFilters: 0,
            errors: 0,
            sectionsProcessed: new Set()
        };
    }

    // Подключение к базе данных
    async connectToDatabase() {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            console.log('✅ Подключение к MongoDB установлено');
        } catch (error) {
            console.error('❌ Ошибка подключения к MongoDB:', error.message);
            throw error;
        }
    }

    // Отключение от базы данных
    async disconnectFromDatabase() {
        try {
            await mongoose.disconnect();
            console.log('✅ Отключение от MongoDB выполнено');
        } catch (error) {
            console.error('❌ Ошибка отключения от MongoDB:', error.message);
        }
    }

    // Очистка существующих фильтров (опционально)
    async clearExistingFilters() {
        try {
            const count = await Filter.countDocuments();
            if (count > 0) {
                console.log(`🗑️ Найдено ${count} существующих фильтров`);
                const result = await Filter.deleteMany({});
                console.log(`✅ Удалено ${result.deletedCount} фильтров`);
            } else {
                console.log('📭 Существующих фильтров не найдено');
            }
        } catch (error) {
            console.error('❌ Ошибка при очистке фильтров:', error.message);
        }
    }

    // Извлечение уникальных фильтров из productValues
    extractFiltersFromProductValues(productValues) {
        const filters = new Map(); // Map для хранения уникальных фильтров по title

        if (!productValues || typeof productValues !== 'object') {
            return filters;
        }

        // Обрабатываем все ключи в productValues
        Object.keys(productValues).forEach(key => {
            const value = productValues[key];
            
            if (value && value.edges && Array.isArray(value.edges)) {
                value.edges.forEach(edge => {
                    if (edge && edge.node) {
                        const { title, value: nodeValue } = edge.node;
                        
                        if (title && nodeValue) {
                            // Если фильтр с таким title уже существует, добавляем новое значение
                            if (filters.has(title)) {
                                const existingFilter = filters.get(title);
                                if (!existingFilter.values.includes(nodeValue)) {
                                    existingFilter.values.push(nodeValue);
                                }
                            } else {
                                // Создаем новый фильтр
                                filters.set(title, {
                                    title: title,
                                    values: [nodeValue]
                                });
                            }
                        }
                    }
                });
            }
        });

        return filters;
    }

    // Получение списка уникальных sectionId
    async getUniqueSectionIds() {
        try {
            const sectionIds = await Product.distinct('section._id', {
                'section._id': { $exists: true },
                productValues: { $exists: true }
            });
            
            console.log(`📋 Найдено ${sectionIds.length} уникальных секций`);
            return sectionIds.sort((a, b) => a - b);
        } catch (error) {
            console.error('❌ Ошибка при получении списка секций:', error.message);
            throw error;
        }
    }

    // Обработка одной секции
    async processSection(sectionId) {
        try {
            console.log(`\n🔧 Обрабатываем секцию ${sectionId}...`);
            
            // Получаем количество продуктов в секции
            const productCount = await Product.countDocuments({
                'section._id': sectionId,
                productValues: { $exists: true }
            });
            
            console.log(`📦 Найдено ${productCount} продуктов в секции ${sectionId}`);

            if (productCount === 0) {
                console.log(`⚠️ Секция ${sectionId}: продуктов не найдено`);
                return;
            }

            // Собираем все фильтры для данной секции
            const sectionFilters = new Map();
            let processedCount = 0;

            // Обрабатываем продукты пакетами
            const batchSize = 100;
            let skip = 0;

            while (skip < productCount) {
                const products = await Product.find({
                    'section._id': sectionId,
                    productValues: { $exists: true }
                })
                .select('productValues')
                .skip(skip)
                .limit(batchSize)
                .lean();

                for (const product of products) {
                    this.stats.processedProducts++;
                    processedCount++;
                    
                    if (product.productValues) {
                        const productFilters = this.extractFiltersFromProductValues(product.productValues);
                        
                        // Объединяем фильтры с общими фильтрами секции
                        productFilters.forEach((filter, title) => {
                            if (sectionFilters.has(title)) {
                                const existingFilter = sectionFilters.get(title);
                                // Добавляем новые значения
                                filter.values.forEach(value => {
                                    if (!existingFilter.values.includes(value)) {
                                        existingFilter.values.push(value);
                                    }
                                });
                            } else {
                                sectionFilters.set(title, filter);
                            }
                        });
                    }
                }

                skip += batchSize;
                console.log(`📊 Секция ${sectionId}: обработано ${processedCount}/${productCount} продуктов`);
            }

            // Создаем объекты фильтров для сохранения
            const filtersToSave = [];
            sectionFilters.forEach((filter, title) => {
                filtersToSave.push({
                    sectionId: sectionId,
                    node: {
                        filter: title,
                        values: filter.values
                    }
                });
            });

            // Сохраняем фильтры в базу данных
            await this.saveFiltersToDatabase(filtersToSave, sectionId);
            
            this.stats.sectionsProcessed.add(sectionId);
            this.stats.totalSections++;
            console.log(`✅ Секция ${sectionId}: создано ${filtersToSave.length} фильтров`);

        } catch (error) {
            console.error(`❌ Ошибка при обработке секции ${sectionId}:`, error.message);
            this.stats.errors++;
        }
    }

    // Сохранение фильтров в базу данных
    async saveFiltersToDatabase(filters, sectionId) {
        try {
            for (const filterData of filters) {
                // Создаем уникальный ID для фильтра
                const filterId = `${sectionId}_${filterData.node.filter}`;
                
                // Создаем объект фильтра в соответствии со схемой
                const filterObject = {
                    _id: filterId,
                    title: filterData.node.filter,
                    type: 'checkbox', // По умолчанию
                    sectionId: sectionId,
                    values: filterData.node.values.map((value, index) => ({
                        _id: `${filterId}_value_${index}`,
                        title: value,
                        isPublic: true,
                        productsCount: 0,
                        totalProductsCount: 0,
                        popularity: 0,
                        __typename: 'FilterValue'
                    })),
                    popularity: 0,
                    isPublic: true,
                    isWrappable: false,
                    isExcludable: false,
                    useValuesSearch: false,
                    __typename: 'Filter'
                };

                // Проверяем, существует ли уже такой фильтр
                const existingFilter = await Filter.findById(filterId);
                
                if (existingFilter) {
                    // Обновляем существующий фильтр
                    await Filter.findByIdAndUpdate(filterId, filterObject, { new: true });
                    console.log(`🔄 Обновлен фильтр: ${filterData.node.filter} (${filterId})`);
                } else {
                    // Создаем новый фильтр
                    const newFilter = new Filter(filterObject);
                    await newFilter.save();
                    console.log(`✅ Сохранен новый фильтр: ${filterData.node.filter} (${filterId})`);
                }

                this.stats.savedFilters++;
            }

            this.stats.totalFilters += filters.length;
            return true;
        } catch (error) {
            console.error(`❌ Ошибка при сохранении фильтров для секции ${sectionId}:`, error.message);
            this.stats.errors++;
            return false;
        }
    }

    // Вывод статистики
    printStats() {
        console.log('\n📊 СТАТИСТИКА ОБРАБОТКИ:');
        console.log(`📦 Всего продуктов: ${this.stats.totalProducts}`);
        console.log(`🔧 Обработано продуктов: ${this.stats.processedProducts}`);
        console.log(`📋 Обработано секций: ${this.stats.totalSections}`);
        console.log(`🎯 Создано фильтров: ${this.stats.totalFilters}`);
        console.log(`💾 Сохранено фильтров: ${this.stats.savedFilters}`);
        console.log(`❌ Ошибок: ${this.stats.errors}`);
        
        if (this.stats.sectionsProcessed.size > 0) {
            console.log('\n📋 Обработанные секции:');
            Array.from(this.stats.sectionsProcessed).sort((a, b) => a - b).forEach(sectionId => {
                console.log(`   - ${sectionId}`);
            });
        }
    }

    // Основной метод обработки
    async processFilters(clearExisting = false) {
        try {
            console.log('🚀 Запуск обработки фильтров...');
            
            // Получаем общее количество продуктов
            this.stats.totalProducts = await Product.countDocuments();
            console.log(`📈 Всего продуктов в базе: ${this.stats.totalProducts}`);
            
            if (clearExisting) {
                await this.clearExistingFilters();
            }

            // Получаем список уникальных секций
            const sectionIds = await this.getUniqueSectionIds();

            // Обрабатываем каждую секцию отдельно
            for (const sectionId of sectionIds) {
                await this.processSection(sectionId);
            }

            this.printStats();
            
            console.log('✅ Обработка фильтров завершена успешно!');
        } catch (error) {
            console.error('❌ Ошибка при обработке фильтров:', error.message);
            throw error;
        }
    }
}

// Основная функция
async function main() {
    const processor = new FiltersStreamProcessor();
    
    try {
        await processor.connectToDatabase();
        
        // Обрабатываем фильтры (можно добавить флаг для очистки существующих)
        await processor.processFilters(false);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
    } finally {
        await processor.disconnectFromDatabase();
    }
}

// Запуск скрипта
if (require.main === module) {
    main().catch(console.error);
}

module.exports = FiltersStreamProcessor; 