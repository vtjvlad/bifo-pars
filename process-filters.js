const mongoose = require('mongoose');
const Product = require('./models/Product.js');
const Filter = require('./models/Filter.js');
require('dotenv').config();

class FiltersProcessor {
    constructor() {
        this.stats = {
            totalProducts: 0,
            processedProducts: 0,
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

        if (!productValues || !productValues.edges || !Array.isArray(productValues.edges)) {
            return filters;
        }

        productValues.edges.forEach(edge => {
            if (edge && edge.node) {
                const { title, value } = edge.node;
                
                if (title && value) {
                    // Если фильтр с таким title уже существует, добавляем новое значение
                    if (filters.has(title)) {
                        const existingFilter = filters.get(title);
                        if (!existingFilter.values.includes(value)) {
                            existingFilter.values.push(value);
                        }
                    } else {
                        // Создаем новый фильтр
                        filters.set(title, {
                            title: title,
                            values: [value]
                        });
                    }
                }
            }
        });

        return filters;
    }

    // Обработка всех продуктов и создание фильтров
    async processProducts() {
        try {
            console.log('📊 Начинаем обработку продуктов...');
            
            // Получаем общее количество продуктов
            this.stats.totalProducts = await Product.countDocuments();
            console.log(`📈 Всего продуктов в базе: ${this.stats.totalProducts}`);

            // Группируем продукты по hlSectionId
            const productsBySection = await Product.aggregate([
                {
                    $match: {
                        hlSectionId: { $exists: true },
                        productValues: { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: '$hlSectionId',
                        products: { $push: '$$ROOT' }
                    }
                }
            ]);

            console.log(`📦 Найдено ${productsBySection.length} уникальных секций`);

            // Обрабатываем каждую секцию
            for (const section of productsBySection) {
                const sectionId = section._id;
                const products = section.products;

                console.log(`\n🔧 Обрабатываем секцию ${sectionId} (${products.length} продуктов)`);

                // Собираем все фильтры для данной секции
                const sectionFilters = new Map();

                for (const product of products) {
                    this.stats.processedProducts++;
                    
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
                console.log(`✅ Секция ${sectionId}: создано ${filtersToSave.length} фильтров`);
            }

        } catch (error) {
            console.error('❌ Ошибка при обработке продуктов:', error.message);
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
        console.log(`📋 Обработано секций: ${this.stats.sectionsProcessed.size}`);
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
            
            if (clearExisting) {
                await this.clearExistingFilters();
            }

            await this.processProducts();
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
    const processor = new FiltersProcessor();
    
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

module.exports = FiltersProcessor; 