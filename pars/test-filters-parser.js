const HotlineFiltersParser = require('./hotline-filters-parser');

async function testFiltersParser() {
    console.log('🧪 Тестирование парсера фильтров Hotline.ua\n');
    
    const parser = new HotlineFiltersParser();
    
    try {
        // Тест 1: Получение фильтров для категории телефонов
        console.log('=== Тест 1: Получение фильтров категории телефонов ===');
        
        const categoryUrl = 'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/';
        const sectionId = 386;
        
        console.log(`📱 Получаем фильтры для: ${categoryUrl}`);
        console.log(`🆔 Section ID: ${sectionId}`);
        
        const filters = await parser.getCategoryFilters(sectionId, categoryUrl);
        
        console.log(`✅ Успешно получено ${filters.length} фильтров\n`);
        
        // Тест 2: Анализ структуры данных
        console.log('=== Тест 2: Анализ структуры данных ===');
        
        if (filters.length > 0) {
            const firstFilter = filters[0];
            console.log('📋 Первый фильтр:');
            console.log(`   ID: ${firstFilter._id}`);
            console.log(`   Название: ${firstFilter.title}`);
            console.log(`   Тип: ${firstFilter.type}`);
            console.log(`   Вес: ${firstFilter.weight}`);
            console.log(`   Публичный: ${firstFilter.isPublic}`);
            console.log(`   Количество значений: ${firstFilter.values ? firstFilter.values.length : 0}`);
            
            if (firstFilter.values && firstFilter.values.length > 0) {
                const firstValue = firstFilter.values[0];
                console.log('   Первое значение:');
                console.log(`     ID: ${firstValue._id}`);
                console.log(`     Название: ${firstValue.title}`);
                console.log(`     Количество товаров: ${firstValue.productsCount}`);
                console.log(`     Популярность: ${firstValue.popularity}`);
            }
        }
        
        // Тест 3: Статистика по типам фильтров
        console.log('\n=== Тест 3: Статистика по типам фильтров ===');
        
        const filterTypes = {};
        filters.forEach(filter => {
            filterTypes[filter.type] = (filterTypes[filter.type] || 0) + 1;
        });
        
        console.log('📊 Распределение по типам:');
        Object.entries(filterTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} фильтров`);
        });
        
        // Тест 4: Поиск и фильтрация
        console.log('\n=== Тест 4: Поиск и фильтрация ===');
        
        const checkboxFilters = parser.filterByType(filters, 'checkbox');
        const rangeFilters = parser.filterByType(filters, 'range');
        
        console.log(`🔘 Checkbox фильтров: ${checkboxFilters.length}`);
        console.log(`📏 Range фильтров: ${rangeFilters.length}`);
        
        // Поиск по названию
        const memoryFilters = parser.searchByName(filters, 'память');
        const priceFilters = parser.searchByName(filters, 'цена');
        
        console.log(`🔍 Фильтров с "память": ${memoryFilters.length}`);
        console.log(`💰 Фильтров с "цена": ${priceFilters.length}`);
        
        // Тест 5: Сохранение результатов
        console.log('\n=== Тест 5: Сохранение результатов ===');
        
        const categoryName = parser.extractPathFromUrl(categoryUrl);
        const jsonFilename = `JSON/test-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
        const csvFilename = `CSV/test-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
        
        await parser.saveToFile(filters, jsonFilename);
        await parser.saveToCSV(filters, csvFilename);
        
        console.log(`✅ Результаты сохранены:`);
        console.log(`   JSON: ${jsonFilename}`);
        console.log(`   CSV: ${csvFilename}`);
        
        // Тест 6: Работа с выбранными фильтрами
        console.log('\n=== Тест 6: Работа с выбранными фильтрами ===');
        
        // Получаем фильтры с выбранным значением (например, бренд Apple)
        const selectedValueIds = [313025]; // ID для Apple
        
        console.log(`🔍 Получаем фильтры с выбранным значением (ID: ${selectedValueIds[0]})...`);
        
        const filtersWithSelection = await parser.getCategoryFilters(
            sectionId,
            categoryUrl,
            selectedValueIds,
            [], // excludedValueIds
            null, // selectedMinPrice
            null, // selectedMaxPrice
            null  // searchPhrase
        );
        
        console.log(`✅ Получено ${filtersWithSelection.length} фильтров с выбором`);
        
        // Сравниваем количество значений
        const originalValueCount = filters.reduce((sum, filter) => 
            sum + (filter.values ? filter.values.length : 0), 0);
        const selectedValueCount = filtersWithSelection.reduce((sum, filter) => 
            sum + (filter.values ? filter.values.length : 0), 0);
        
        console.log(`📈 Общее количество значений: ${originalValueCount}`);
        console.log(`📉 Количество значений с фильтром: ${selectedValueCount}`);
        console.log(`🔍 Отфильтровано значений: ${originalValueCount - selectedValueCount}`);
        
        // Тест 7: Проверка статистики запросов
        console.log('\n=== Тест 7: Статистика запросов ===');
        
        const stats = parser.requestStats;
        const successRate = (stats.successfulRequests / stats.totalRequests * 100).toFixed(1);
        
        console.log(`📊 Статистика запросов:`);
        console.log(`   Всего запросов: ${stats.totalRequests}`);
        console.log(`   Успешных: ${stats.successfulRequests}`);
        console.log(`   Неудачных: ${stats.failedRequests}`);
        console.log(`   Процент успеха: ${successRate}%`);
        
        console.log('\n🎉 Все тесты выполнены успешно!');
        
    } catch (error) {
        console.error('❌ Ошибка в тесте:', error.message);
        
        if (error.response) {
            console.error('Статус ответа:', error.response.status);
            console.error('Данные ответа:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Запускаем тест, если файл запущен напрямую
if (require.main === module) {
    testFiltersParser();
}

module.exports = { testFiltersParser }; 