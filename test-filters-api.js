const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

class FiltersAPITester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async testEndpoint(endpoint, description, expectedStatus = 200) {
        try {
            console.log(`🧪 Тестируем: ${description}`);
            const response = await axios.get(`${BASE_URL}${endpoint}`);
            
            if (response.status === expectedStatus) {
                console.log(`✅ Успех: ${description}`);
                this.results.passed++;
                return true;
            } else {
                console.log(`❌ Ошибка: ${description} (статус ${response.status}, ожидался ${expectedStatus})`);
                this.results.failed++;
                return false;
            }
        } catch (error) {
            console.log(`❌ Ошибка: ${description} - ${error.message}`);
            this.results.failed++;
            this.results.errors.push({
                endpoint,
                description,
                error: error.message
            });
            return false;
        } finally {
            this.results.total++;
        }
    }

    async runTests() {
        console.log('🚀 Начинаем тестирование API фильтров...\n');

        // Тестируем основные endpoints
        await this.testEndpoint('/filters', 'Получение всех фильтров');
        await this.testEndpoint('/filters?limit=5', 'Получение фильтров с лимитом');
        await this.testEndpoint('/filters?page=1&limit=10', 'Получение фильтров с пагинацией');
        
        // Тестируем фильтрацию
        await this.testEndpoint('/filters?sectionId=386', 'Фильтры по section ID');
        await this.testEndpoint('/filters?type=checkbox', 'Фильтры по типу');
        await this.testEndpoint('/filters?search=цена', 'Поиск фильтров');
        
        // Тестируем специальные endpoints
        await this.testEndpoint('/filters/types', 'Получение типов фильтров');
        await this.testEndpoint('/filters/sections', 'Получение section ID');
        await this.testEndpoint('/filters/stats', 'Получение статистики');
        
        // Тестируем фильтры по section ID
        await this.testEndpoint('/filters/section/386', 'Фильтры для section 386');
        await this.testEndpoint('/filters/section/387', 'Фильтры для section 387');
        
        // Тестируем фильтры по категории
        await this.testEndpoint('/filters/category/mobilnye-telefony-i-smartfony', 'Фильтры по названию категории');
        
        // Тестируем несуществующие ресурсы
        await this.testEndpoint('/filters/nonexistent', 'Несуществующий фильтр', 404);
        await this.testEndpoint('/filters/section/999999', 'Несуществующий section', 200);

        this.printResults();
    }

    printResults() {
        console.log('\n📊 Результаты тестирования:');
        console.log(`   Всего тестов: ${this.results.total}`);
        console.log(`   Успешных: ${this.results.passed}`);
        console.log(`   Неудачных: ${this.results.failed}`);
        console.log(`   Процент успеха: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ Ошибки:');
            this.results.errors.forEach(error => {
                console.log(`   ${error.description}: ${error.error}`);
            });
        }
    }

    async testSpecificFilter() {
        try {
            console.log('\n🔍 Тестируем получение конкретного фильтра...');
            
            // Сначала получаем список фильтров
            const filtersResponse = await axios.get(`${BASE_URL}/filters?limit=1`);
            
            if (filtersResponse.data.data && filtersResponse.data.data.length > 0) {
                const filterId = filtersResponse.data.data[0]._id;
                console.log(`📋 Тестируем фильтр с ID: ${filterId}`);
                
                const filterResponse = await axios.get(`${BASE_URL}/filters/${filterId}`);
                console.log(`✅ Фильтр получен: ${filterResponse.data.data.title}`);
                
                return true;
            } else {
                console.log('⚠️ Нет фильтров для тестирования');
                return false;
            }
        } catch (error) {
            console.log(`❌ Ошибка при тестировании конкретного фильтра: ${error.message}`);
            return false;
        }
    }

    async testDatabaseStats() {
        try {
            console.log('\n📊 Тестируем статистику базы данных...');
            
            const statsResponse = await axios.get(`${BASE_URL}/filters/stats`);
            const stats = statsResponse.data.data;
            
            console.log(`   Всего фильтров: ${stats.totalFilters}`);
            console.log(`   Уникальных категорий: ${stats.uniqueCategories}`);
            console.log(`   Типы фильтров: ${stats.filterTypes.join(', ')}`);
            
            if (stats.categoryStats && stats.categoryStats.length > 0) {
                console.log('\n📋 Фильтры по категориям:');
                stats.categoryStats.slice(0, 5).forEach(stat => {
                    console.log(`   ${stat.categoryName || `Section ${stat._id}`}: ${stat.count} фильтров`);
                });
            }
            
            return true;
        } catch (error) {
            console.log(`❌ Ошибка при получении статистики: ${error.message}`);
            return false;
        }
    }
}

async function main() {
    const tester = new FiltersAPITester();
    
    try {
        // Основные тесты
        await tester.runTests();
        
        // Дополнительные тесты
        await tester.testSpecificFilter();
        await tester.testDatabaseStats();
        
        console.log('\n🎉 Тестирование завершено!');
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
    }
}

// Запускаем тесты если файл запущен напрямую
if (require.main === module) {
    main();
}

module.exports = FiltersAPITester; 