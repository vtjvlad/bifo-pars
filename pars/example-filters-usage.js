const HotlineFiltersParser = require('./hotline-filters-parser');

// Пример использования парсера фильтров
async function exampleUsage() {
    const parser = new HotlineFiltersParser();
    
    console.log('🚀 Примеры использования парсера фильтров Hotline.ua\n');
    
    try {
        // Пример 1: Получение фильтров для одной категории
        console.log('=== Пример 1: Фильтры одной категории ===');
        const singleCategoryUrl = 'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/';
        const sectionId = 386;
        
        const filters = await parser.getCategoryFilters(sectionId, singleCategoryUrl);
        console.log(`✅ Получено ${filters.length} фильтров для категории телефонов`);
        
        // Анализируем типы фильтров
        const filterTypes = {};
        filters.forEach(filter => {
            filterTypes[filter.type] = (filterTypes[filter.type] || 0) + 1;
        });
        console.log('📊 Типы фильтров:', filterTypes);
        
        // Показываем первые 3 фильтра
        console.log('\n📋 Первые 3 фильтра:');
        filters.slice(0, 3).forEach((filter, index) => {
            console.log(`${index + 1}. ${filter.title} (${filter.type})`);
            if (filter.values && filter.values.length > 0) {
                console.log(`   Значений: ${filter.values.length}`);
                console.log(`   Примеры: ${filter.values.slice(0, 3).map(v => v.title).join(', ')}`);
            }
        });
        
        // Пример 2: Фильтрация и поиск
        console.log('\n=== Пример 2: Фильтрация и поиск ===');
        
        // Фильтры по типу
        const checkboxFilters = parser.filterByType(filters, 'checkbox');
        const rangeFilters = parser.filterByType(filters, 'range');
        console.log(`🔘 Checkbox фильтров: ${checkboxFilters.length}`);
        console.log(`📏 Range фильтров: ${rangeFilters.length}`);
        
        // Поиск по названию
        const memoryFilters = parser.searchByName(filters, 'память');
        const priceFilters = parser.searchByName(filters, 'цена');
        console.log(`🔍 Фильтров с "память": ${memoryFilters.length}`);
        console.log(`💰 Фильтров с "цена": ${priceFilters.length}`);
        
        // Пример 3: Анализ значений фильтров
        console.log('\n=== Пример 3: Анализ значений фильтров ===');
        
        const filterWithMostValues = filters.reduce((max, filter) => {
            const valueCount = filter.values ? filter.values.length : 0;
            return valueCount > (max.values ? max.values.length : 0) ? filter : max;
        }, {});
        
        if (filterWithMostValues.values) {
            console.log(`📊 Фильтр с наибольшим количеством значений: ${filterWithMostValues.title}`);
            console.log(`   Количество значений: ${filterWithMostValues.values.length}`);
            console.log(`   Тип: ${filterWithMostValues.type}`);
            
            // Показываем топ-5 значений по популярности
            const topValues = filterWithMostValues.values
                .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                .slice(0, 5);
            
            console.log('   Топ-5 значений по популярности:');
            topValues.forEach((value, index) => {
                console.log(`     ${index + 1}. ${value.title} (популярность: ${value.popularity || 0})`);
            });
        }
        
        // Пример 4: Сохранение результатов
        console.log('\n=== Пример 4: Сохранение результатов ===');
        
        const categoryName = parser.extractPathFromUrl(singleCategoryUrl);
        
        // Сохраняем в JSON
        const jsonFilename = `JSON/example-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
        await parser.saveToFile(filters, jsonFilename);
        
        // Сохраняем в CSV
        const csvFilename = `CSV/example-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
        await parser.saveToCSV(filters, csvFilename);
        
        console.log('✅ Результаты сохранены в JSON и CSV файлы');
        
        // Пример 5: Работа с выбранными фильтрами
        console.log('\n=== Пример 5: Работа с выбранными фильтрами ===');
        
        // Получаем фильтры с выбранными значениями (например, выбран бренд Apple)
        const selectedValueIds = [313025]; // ID для Apple (пример)
        const filtersWithSelection = await parser.getCategoryFilters(
            sectionId, 
            singleCategoryUrl, 
            selectedValueIds, 
            [], // excludedValueIds
            null, // selectedMinPrice
            null, // selectedMaxPrice
            null  // searchPhrase
        );
        
        console.log(`📊 Фильтры с выбранным брендом Apple: ${filtersWithSelection.length}`);
        
        // Сравниваем количество значений
        const originalValueCount = filters.reduce((sum, filter) => sum + (filter.values ? filter.values.length : 0), 0);
        const selectedValueCount = filtersWithSelection.reduce((sum, filter) => sum + (filter.values ? filter.values.length : 0), 0);
        
        console.log(`📈 Общее количество значений: ${originalValueCount}`);
        console.log(`📉 Количество значений с фильтром: ${selectedValueCount}`);
        console.log(`🔍 Разница: ${originalValueCount - selectedValueCount} значений отфильтровано`);
        
        console.log('\n🎉 Все примеры выполнены успешно!');
        
    } catch (error) {
        console.error('❌ Ошибка в примере:', error.message);
    }
}

// Пример работы с несколькими категориями
async function multipleCategoriesExample() {
    const parser = new HotlineFiltersParser();
    
    console.log('\n🔄 Пример работы с несколькими категориями\n');
    
    try {
        // Создаем тестовые категории
        const testCategories = [
            {
                url: 'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/',
                sectionId: 386
            },
            {
                url: 'https://hotline.ua/computer/noutbuki/',
                sectionId: 387
            }
        ];
        
        console.log(`📦 Обрабатываем ${testCategories.length} категории...`);
        
        const results = await parser.getAllCategoryFilters(testCategories, true, true);
        
        console.log('\n📊 Результаты по категориям:');
        Object.keys(results).forEach(categoryName => {
            const result = results[categoryName];
            if (result.error) {
                console.log(`❌ ${categoryName}: ${result.error}`);
            } else {
                console.log(`✅ ${categoryName}: ${result.filtersCount} фильтров`);
                
                // Показываем типы фильтров для каждой категории
                const filterTypes = {};
                result.filters.forEach(filter => {
                    filterTypes[filter.type] = (filterTypes[filter.type] || 0) + 1;
                });
                console.log(`   Типы: ${Object.entries(filterTypes).map(([type, count]) => `${type}:${count}`).join(', ')}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка при работе с несколькими категориями:', error.message);
    }
}

// Запуск примеров
async function runExamples() {
    console.log('🚀 Запуск примеров использования парсера фильтров\n');
    
    await exampleUsage();
    await multipleCategoriesExample();
    
    console.log('\n✨ Все примеры завершены!');
}

// Запускаем примеры, если файл запущен напрямую
if (require.main === module) {
    runExamples();
}

module.exports = {
    exampleUsage,
    multipleCategoriesExample,
    runExamples
}; 