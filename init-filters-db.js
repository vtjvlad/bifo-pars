const mongoose = require('mongoose');
const HotlineFiltersParser = require('./pars/hotline-filters-parser.js');
const Filter = require('./models/Filter.js');
require('dotenv').config();

class FiltersDatabaseInitializer {
    constructor() {
        this.parser = new HotlineFiltersParser();
        this.stats = {
            totalCategories: 0,
            processedCategories: 0,
            totalFilters: 0,
            savedFilters: 0,
            errors: 0
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

    // Сохранение фильтра в базу данных
    async saveFilterToDatabase(filterData, sectionId, categoryUrl, categoryName) {
        try {
            // Добавляем информацию о категории к фильтру
            const filterWithCategory = {
                ...filterData,
                sectionId: sectionId,
                categoryUrl: categoryUrl,
                categoryName: categoryName
            };

            // Проверяем, существует ли уже такой фильтр
            const existingFilter = await Filter.findById(filterData._id);
            
            if (existingFilter) {
                // Обновляем существующий фильтр
                await Filter.findByIdAndUpdate(filterData._id, filterWithCategory, { new: true });
                console.log(`🔄 Обновлен фильтр: ${filterData.title} (${filterData._id})`);
            } else {
                // Создаем новый фильтр
                const newFilter = new Filter(filterWithCategory);
                await newFilter.save();
                console.log(`✅ Сохранен новый фильтр: ${filterData.title} (${filterData._id})`);
            }

            this.stats.savedFilters++;
            return true;
        } catch (error) {
            console.error(`❌ Ошибка при сохранении фильтра ${filterData._id}:`, error.message);
            this.stats.errors++;
            return false;
        }
    }

    // Обработка одной категории
    async processCategory(categoryData) {
        const { url: categoryUrl, sectionId } = categoryData;
        const categoryName = this.parser.extractPathFromUrl(categoryUrl);

        console.log(`\n📦 Обрабатываем категорию: ${categoryName} (sectionId: ${sectionId})`);

        try {
            // Получаем токены для категории
            await this.parser.getTokensForCategory(categoryUrl);

            // Получаем фильтры для категории
            const filters = await this.parser.getCategoryFilters(sectionId, categoryUrl);

            if (!filters || filters.length === 0) {
                console.log(`⚠️ Фильтры не найдены для категории: ${categoryName}`);
                return;
            }

            console.log(`📋 Найдено ${filters.length} фильтров для категории ${categoryName}`);

            // Сохраняем каждый фильтр в базу данных
            for (const filter of filters) {
                await this.saveFilterToDatabase(filter, sectionId, categoryUrl, categoryName);
            }

            this.stats.processedCategories++;
            this.stats.totalFilters += filters.length;

        } catch (error) {
            console.error(`❌ Ошибка при обработке категории ${categoryName}:`, error.message);
            this.stats.errors++;
        }
    }

    // Основной метод инициализации
    async initializeFiltersDatabase(clearExisting = false) {
        console.log('🚀 Начинаем инициализацию базы данных фильтров...');

        try {
            // Подключаемся к базе данных
            await this.connectToDatabase();

            // Очищаем существующие фильтры если нужно
            if (clearExisting) {
                await this.clearExistingFilters();
            }

            // Загружаем категории из файла
            console.log('📁 Загружаем категории из файла...');
            const categories = await this.parser.loadCategoriesFromFile('pars/categories-filters.txt');
            
            if (categories.length === 0) {
                console.log('❌ Не найдено категорий для обработки');
                return;
            }

            this.stats.totalCategories = categories.length;
            console.log(`📋 Загружено ${categories.length} категорий`);

            // Обрабатываем каждую категорию
            for (let i = 0; i < categories.length; i++) {
                const categoryData = categories[i];
                console.log(`\n[${i + 1}/${categories.length}] Обработка категории...`);
                
                await this.processCategory(categoryData);

                // Небольшая пауза между категориями
                if (i < categories.length - 1) {
                    console.log('⏱️ Пауза между категориями...');
                    await this.parser.delay(2000);
                }
            }

            // Выводим итоговую статистику
            this.printFinalStats();

        } catch (error) {
            console.error('❌ Критическая ошибка:', error.message);
        } finally {
            // Отключаемся от базы данных
            await this.disconnectFromDatabase();
        }
    }

    // Вывод итоговой статистики
    printFinalStats() {
        console.log('\n📊 Итоговая статистика инициализации:');
        console.log(`   Всего категорий: ${this.stats.totalCategories}`);
        console.log(`   Обработано категорий: ${this.stats.processedCategories}`);
        console.log(`   Всего фильтров: ${this.stats.totalFilters}`);
        console.log(`   Сохранено фильтров: ${this.stats.savedFilters}`);
        console.log(`   Ошибок: ${this.stats.errors}`);
        
        const successRate = this.stats.totalCategories > 0 ? 
            (this.stats.processedCategories / this.stats.totalCategories * 100).toFixed(1) : 0;
        console.log(`   Процент успеха: ${successRate}%`);
    }

    // Метод для получения статистики из базы данных
    async getDatabaseStats() {
        try {
            await this.connectToDatabase();
            
            const totalFilters = await Filter.countDocuments();
            const uniqueCategories = await Filter.distinct('sectionId');
            const filterTypes = await Filter.distinct('type');
            
            console.log('\n📊 Статистика базы данных фильтров:');
            console.log(`   Всего фильтров: ${totalFilters}`);
            console.log(`   Уникальных категорий: ${uniqueCategories.length}`);
            console.log(`   Типов фильтров: ${filterTypes.join(', ')}`);
            
            // Статистика по категориям
            const categoryStats = await Filter.aggregate([
                {
                    $group: {
                        _id: '$sectionId',
                        count: { $sum: 1 },
                        categoryName: { $first: '$categoryName' }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            console.log('\n📋 Фильтры по категориям:');
            categoryStats.forEach(stat => {
                console.log(`   ${stat.categoryName || `Section ${stat._id}`}: ${stat.count} фильтров`);
            });

        } catch (error) {
            console.error('❌ Ошибка при получении статистики:', error.message);
        } finally {
            await this.disconnectFromDatabase();
        }
    }
}

// Основная функция
async function main() {
    const initializer = new FiltersDatabaseInitializer();
    
    // Параметры запуска
    const CLEAR_EXISTING = process.argv.includes('--clear');
    const SHOW_STATS = process.argv.includes('--stats');
    
    if (SHOW_STATS) {
        // Показываем статистику базы данных
        await initializer.getDatabaseStats();
    } else {
        // Инициализируем базу данных
        await initializer.initializeFiltersDatabase(CLEAR_EXISTING);
    }
}

// Запускаем если файл запущен напрямую
if (require.main === module) {
    main().catch(console.error);
}

module.exports = FiltersDatabaseInitializer; 