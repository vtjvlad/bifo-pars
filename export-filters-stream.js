const mongoose = require('mongoose');
const Product = require('./models/Product.js');
const Filter = require('./models/Filter.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class FiltersStreamJsonExporter {
    constructor() {
        this.stats = {
            totalProducts: 0,
            processedProducts: 0,
            totalSections: 0,
            totalFilters: 0,
            errors: 0
        };
        this.jsonData = [];
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

            // Создаем объекты фильтров в требуемом формате
            sectionFilters.forEach((filter, title) => {
                this.jsonData.push({
                    sectionId: sectionId,
                    node: {
                        filter: title,
                        values: filter.values
                    }
                });
            });

            this.stats.totalSections++;
            this.stats.totalFilters += sectionFilters.size;
            console.log(`✅ Секция ${sectionId}: создано ${sectionFilters.size} фильтров`);

        } catch (error) {
            console.error(`❌ Ошибка при обработке секции ${sectionId}:`, error.message);
            this.stats.errors++;
        }
    }

    // Сохранение JSON файла
    async saveJsonFile(data, filename = 'filters.json') {
        try {
            const filePath = path.join(__dirname, filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`💾 JSON файл сохранен: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('❌ Ошибка при сохранении JSON файла:', error.message);
            throw error;
        }
    }

    // Загрузка JSON файла в коллекцию filters
    async loadJsonToDatabase(filePath) {
        try {
            console.log('📥 Загружаем данные в коллекцию filters...');
            
            const jsonData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            let savedCount = 0;
            let updatedCount = 0;

            for (const filterData of jsonData) {
                try {
                    // Создаем уникальный ID для фильтра
                    const filterId = `${filterData.sectionId}_${filterData.node.filter}`;
                    
                    // Создаем объект фильтра в соответствии со схемой
                    const filterObject = {
                        _id: filterId,
                        title: filterData.node.filter,
                        type: 'checkbox', // По умолчанию
                        sectionId: filterData.sectionId,
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
                        updatedCount++;
                    } else {
                        // Создаем новый фильтр
                        const newFilter = new Filter(filterObject);
                        await newFilter.save();
                        savedCount++;
                    }

                } catch (error) {
                    console.error(`❌ Ошибка при сохранении фильтра ${filterData.sectionId}_${filterData.node.filter}:`, error.message);
                    this.stats.errors++;
                }
            }

            console.log(`✅ Загружено в базу данных: ${savedCount} новых, ${updatedCount} обновлено фильтров`);
            return { saved: savedCount, updated: updatedCount };

        } catch (error) {
            console.error('❌ Ошибка при загрузке в базу данных:', error.message);
            throw error;
        }
    }

    // Вывод статистики
    printStats() {
        console.log('\n📊 СТАТИСТИКА ЭКСПОРТА:');
        console.log(`📦 Всего продуктов: ${this.stats.totalProducts}`);
        console.log(`🔧 Обработано продуктов: ${this.stats.processedProducts}`);
        console.log(`📋 Обработано секций: ${this.stats.totalSections}`);
        console.log(`🎯 Создано фильтров: ${this.stats.totalFilters}`);
        console.log(`❌ Ошибок: ${this.stats.errors}`);
    }

    // Основной метод экспорта
    async exportFiltersToJson(saveToDatabase = true) {
        try {
            console.log('🚀 Запуск экспорта фильтров в JSON...');
            
            // Получаем общее количество продуктов
            this.stats.totalProducts = await Product.countDocuments();
            console.log(`📈 Всего продуктов в базе: ${this.stats.totalProducts}`);

            // Получаем список уникальных секций
            const sectionIds = await this.getUniqueSectionIds();

            // Обрабатываем каждую секцию отдельно
            for (const sectionId of sectionIds) {
                await this.processSection(sectionId);
            }
            
            // Сохраняем JSON файл
            const filePath = await this.saveJsonFile(this.jsonData);
            
            // Загружаем в базу данных, если требуется
            if (saveToDatabase) {
                await this.loadJsonToDatabase(filePath);
            }
            
            this.printStats();
            
            console.log('✅ Экспорт фильтров завершен успешно!');
            return filePath;
            
        } catch (error) {
            console.error('❌ Ошибка при экспорте фильтров:', error.message);
            throw error;
        }
    }
}

// Основная функция
async function main() {
    const exporter = new FiltersStreamJsonExporter();
    
    try {
        await exporter.connectToDatabase();
        
        // Экспортируем фильтры в JSON и сохраняем в базу данных
        await exporter.exportFiltersToJson(true);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
    } finally {
        await exporter.disconnectFromDatabase();
    }
}

// Запуск скрипта
if (require.main === module) {
    main().catch(console.error);
}

module.exports = FiltersStreamJsonExporter; 