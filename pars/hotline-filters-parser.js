const axios = require('axios');
const fs = require('fs').promises;
const cliProgress = require('cli-progress');
const { XTOKEN, XREQUESTID } = require('./tt')();

class HotlineFiltersParser {
    constructor() {
        this.baseUrl = 'https://hotline.ua/svc/frontend-api/graphql';
        this.baseHeaders = {
            'accept': '*/*',
            'content-type': 'application/json',
            'x-language': 'uk',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        this.progressBar = null;
        this.startTime = null;
        this.logBuffer = [];
        this.progressActive = false;
        this.requestStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastErrorTime: null,
            consecutiveErrors: 0
        };
        this.currentCategory = null;
        this.currentTokens = {
            'x-token': null,
            'x-request-id': null
        };
        
        // Создаем папки для сохранения файлов (асинхронно)
        this.ensureDirectories().catch(error => {
            console.error('Ошибка при создании папок:', error.message);
        });
    }

    generateRequestId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Создание необходимых папок
    async ensureDirectories() {
        try {
            await fs.mkdir('JSON', { recursive: true });
            await fs.mkdir('CSV', { recursive: true });
            this.log('📁 Папки JSON и CSV созданы/проверены');
        } catch (error) {
            this.log(`❌ Ошибка при создании папок: ${error.message}`);
        }
    }

    // Извлекаем путь категории из URL
    extractPathFromUrl(url) {
        try {
            const urlObj = new URL(url);
            // Убираем начальный и конечный слеш
            let path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
            // Разбиваем путь на части и берем только последний фрагмент
            const pathParts = path.split('/');
            const lastFragment = pathParts[pathParts.length - 1];
            return lastFragment;
        } catch (error) {
            this.log(`❌ Ошибка при извлечении пути из URL: ${url}`);
            throw error;
        }
    }

    // Получаем заголовки для конкретной категории
    getHeadersForCategory(categoryUrl) {
        return {
            ...this.baseHeaders,
            'x-referer': categoryUrl,
            'x-token': this.currentTokens['x-token'],
            'x-request-id': this.currentTokens['x-request-id']
        };
    }

    // Получение токенов для конкретной категории
    async getTokensForCategory(categoryUrl) {
        try {
            this.log(`🔑 Получение токенов для категории: ${this.extractPathFromUrl(categoryUrl)}`);
            
            // Используем puppeteer для получения токенов
            const puppeteer = require('puppeteer');
            
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            const page = await browser.newPage();
            
            // Устанавливаем User-Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1920, height: 1080 });

            // Перехватываем сетевые запросы
            await page.setRequestInterception(true);
            
            const requests = [];
            page.on('request', request => {
                requests.push({
                    url: request.url(),
                    headers: request.headers(),
                    method: request.method()
                });
                request.continue();
            });

            // Переходим на страницу категории
            await page.goto(categoryUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Ждем загрузки всех ресурсов
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Ищем GraphQL запросы с токенами
            const graphqlRequests = requests.filter(req => 
                req.url.includes('graphql') || 
                req.url.includes('api') ||
                req.headers['x-token'] ||
                req.headers['x-request-id']
            );

            let tokens = {
                'x-token': null,
                'x-request-id': null
            };

            // Ищем токены в заголовках запросов
            for (const req of graphqlRequests) {
                if (req.headers['x-token']) {
                    tokens['x-token'] = req.headers['x-token'];
                }
                if (req.headers['x-request-id']) {
                    tokens['x-request-id'] = req.headers['x-request-id'];
                }
            }

            // Если токены не найдены, ищем в JavaScript коде
            if (!tokens['x-token'] || !tokens['x-request-id']) {
                const pageContent = await page.content();
                
                const xTokenMatch = pageContent.match(/x-token["\s]*:["\s]*["']([^"']+)["']/i);
                if (xTokenMatch) {
                    tokens['x-token'] = xTokenMatch[1];
                }

                const xRequestIdMatch = pageContent.match(/x-request-id["\s]*:["\s]*["']([^"']+)["']/i);
                if (xRequestIdMatch) {
                    tokens['x-request-id'] = xRequestIdMatch[1];
                }
            }

            // Генерируем x-request-id если не найден
            if (!tokens['x-request-id']) {
                tokens['x-request-id'] = this.generateRequestId();
            }

            await browser.close();

            if (tokens['x-token'] && tokens['x-request-id']) {
                this.currentTokens = tokens;
                this.log(`✅ Токены получены: x-token=${tokens['x-token'].substring(0, 10)}..., x-request-id=${tokens['x-request-id'].substring(0, 10)}...`);
                return tokens;
            } else {
                throw new Error('Не удалось получить токены для категории');
            }

        } catch (error) {
            this.log(`❌ Ошибка при получении токенов: ${error.message}`);
            
            // Используем дефолтные токены как fallback
            this.currentTokens = {
                'x-token': XTOKEN,
                'x-request-id': XREQUESTID
            };
            
            this.log(`🔄 Используем дефолтные токены как fallback`);
            return this.currentTokens;
        }
    }

    initProgressBar(totalCategories) {
        try {
            this.startTime = Date.now();
            this.progressActive = true;
            this.logBuffer = [];
            
            this.progressBar = new cliProgress.SingleBar({
                format: '📊 Парсинг фильтров |{bar}| {percentage}% | Категория {value}/{total} | {speed} кат/с | ETA: {eta}s',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true,
                clearOnComplete: false,
                stopOnComplete: false,
                forceRedraw: true
            }, cliProgress.Presets.rect);
            
            this.progressBar.start(totalCategories, 0, {
                speed: '0.0',
                eta: '∞'
            });
        } catch (error) {
            console.error('Ошибка инициализации прогресс бара:', error.message);
            this.progressActive = false;
        }
    }

    updateProgress(currentCategory, filtersCount = 0) {
        if (!this.progressBar || !this.progressActive) return;
        
        try {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const speed = currentCategory / elapsed;
            const eta = Math.round((this.progressBar.total - currentCategory) / speed);
            
            this.progressBar.update(currentCategory, {
                speed: speed.toFixed(1),
                eta: isFinite(eta) ? eta : '∞'
            });
        } catch (error) {
            console.error('Ошибка обновления прогресс бара:', error.message);
        }
    }

    stopProgress() {
        if (this.progressBar && this.progressActive) {
            try {
                this.progressBar.stop();
                this.progressActive = false;
                
                // Выводим накопленные логи
                if (this.logBuffer.length > 0) {
                    this.logBuffer.forEach(msg => console.log(msg));
                    this.logBuffer = [];
                }
                
                this.progressBar = null;
            } catch (error) {
                console.error('Ошибка остановки прогресс бара:', error.message);
            }
        }
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;
        
        if (this.progressActive && this.progressBar) {
            // Если прогресс бар активен, добавляем сообщение в буфер
            this.logBuffer.push(formattedMessage);
            
            // Если буфер становится слишком большим, выводим сообщения
            if (this.logBuffer.length > 10) {
                this.flushLogs();
            }
        } else {
            console.log(formattedMessage);
        }
    }

    flushLogs() {
        if (this.logBuffer.length === 0) return;
        
        if (this.progressActive && this.progressBar) {
            try {
                // Временно очищаем строку прогресс бара
                process.stdout.write('\r\x1b[K');
                
                // Выводим все накопленные сообщения
                this.logBuffer.forEach(msg => console.log(msg));
                this.logBuffer = [];
                
                // Принудительно перерисовываем прогресс бар
                this.progressBar.render();
            } catch (error) {
                console.error('Ошибка вывода логов:', error.message);
            }
        } else {
            this.logBuffer.forEach(msg => console.log(msg));
            this.logBuffer = [];
        }
    }

    // Получение фильтров для конкретной категории
    async getCategoryFilters(sectionId, categoryUrl = null, selectedValueIds = [], excludedValueIds = [], selectedMinPrice = null, selectedMaxPrice = null, searchPhrase = null) {
        const query = `
            query sectionProductFilters($sectionId: Int!, $selectedValueIds: [Int], $excludedValueIds: [Int], $selectedMinPrice: Int, $selectedMaxPrice: Int, $searchPhrase: String) {
                sectionProductFilters(sectionId: $sectionId, selectedValueIds: $selectedValueIds, excludedValueIds: $excludedValueIds, selectedMinPrice: $selectedMinPrice, selectedMaxPrice: $selectedMaxPrice, searchPhrase: $searchPhrase) {
                    _id
                    title
                    description
                    type
                    weight
                    values {
                        _id
                        isNoFollow
                        title
                        alias
                        description
                        weight
                        isPublic
                        productsCount
                        totalProductsCount
                        popularity
                        groupId
                        groupTitle
                        __typename
                    }
                    topValues {
                        _id
                        isNoFollow
                        title
                        alias
                        description
                        weight
                        isPublic
                        productsCount
                        totalProductsCount
                        popularity
                        groupId
                        groupTitle
                        __typename
                    }
                    valueGroups {
                        _id
                        title
                        values {
                            _id
                            title
                            alias
                            description
                            weight
                            isPublic
                            productsCount
                            totalProductsCount
                            popularity
                            groupId
                            groupTitle
                            __typename
                        }
                        __typename
                    }
                    popularity
                    isPublic
                    isWrappable
                    isExcludable
                    useValuesSearch
                    __typename
                }
            }
        `;

        // Определяем заголовки
        let headers = this.baseHeaders;
        
        if (categoryUrl) {
            headers = this.getHeadersForCategory(categoryUrl);
            this.currentCategory = this.extractPathFromUrl(categoryUrl);
        }

        const variables = {
            sectionId: sectionId,
            selectedValueIds: selectedValueIds,
            excludedValueIds: excludedValueIds,
            selectedMinPrice: selectedMinPrice,
            selectedMaxPrice: selectedMaxPrice,
            searchPhrase: searchPhrase
        };

        try {
            const response = await axios.post(this.baseUrl, {
                operationName: "sectionProductFilters",
                variables: variables,
                query: query
            }, {
                headers: headers
            });

            // Проверяем структуру ответа
            if (!response.data) {
                throw new Error('Пустой ответ от сервера');
            }

            if (response.data.errors) {
                this.log('Ошибки GraphQL: ' + JSON.stringify(response.data.errors));
                throw new Error(`GraphQL ошибки: ${JSON.stringify(response.data.errors)}`);
            }

            if (!response.data.data) {
                this.log('Неожиданная структура ответа: ' + JSON.stringify(response.data, null, 2));
                throw new Error('Отсутствует data в ответе');
            }

            if (!response.data.data.sectionProductFilters) {
                this.log('Неожиданная структура ответа: ' + JSON.stringify(response.data.data, null, 2));
                throw new Error('Отсутствует sectionProductFilters в ответе');
            }

            // Обновляем статистику успешного запроса
            this.updateRequestStats(true);
            return response.data.data.sectionProductFilters;
        } catch (error) {
            // Обновляем статистику неудачного запроса
            this.updateRequestStats(false);
            
            this.log('❌ Ошибка при получении фильтров: ' + error.message);
            if (error.response) {
                this.log('Статус ответа: ' + error.response.status);
                this.log('Заголовки ответа: ' + JSON.stringify(error.response.headers));
                this.log('Данные ответа: ' + JSON.stringify(error.response.data));
            }
            throw error;
        }
    }

    // Получение фильтров для всех категорий
    async getAllCategoryFilters(categories, saveProgressively = true, autoGetTokens = true) {
        const allResults = {};
        let totalFilters = 0;
        
        this.log(`🔄 Начинаем парсинг фильтров для ${categories.length} категорий...`);
        
        // Инициализируем прогресс-бар
        this.initProgressBar(categories.length);
        
        for (let i = 0; i < categories.length; i++) {
            const categoryData = categories[i];
            const categoryUrl = categoryData.url || categoryData;
            const sectionId = categoryData.sectionId || categoryData.id || 386; // дефолтный ID
            const categoryName = this.extractPathFromUrl(categoryUrl);
            
            this.log(`\n📦 [${i + 1}/${categories.length}] Обрабатываем фильтры категории: ${categoryName} (ID: ${sectionId})`);
            
            try {
                // Сбрасываем статистику для каждой категории
                this.requestStats = {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    lastErrorTime: null,
                    consecutiveErrors: 0
                };
                
                // Получаем актуальные токены для текущей категории (если включено)
                if (autoGetTokens) {
                    await this.getTokensForCategory(categoryUrl);
                }
                
                const filters = await this.getCategoryFilters(sectionId, categoryUrl);
                
                allResults[categoryName] = {
                    url: categoryUrl,
                    sectionId: sectionId,
                    filters: filters,
                    filtersCount: filters.length
                };
                
                totalFilters += filters.length;
                
                this.log(`✅ Категория ${categoryName}: получено ${filters.length} фильтров`);
                
                // Сохраняем отдельный файл для каждой категории
                const filename = `JSON/hotline-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
                await this.saveToFile(filters, filename);
                
                // Сохраняем CSV файл для каждой категории
                const csvFilename = `CSV/hotline-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
                await this.saveToCSV(filters, csvFilename);
                
                // Обновляем прогресс-бар
                this.updateProgress(i + 1, filters.length);
                
                // Небольшая пауза между категориями
                if (i < categories.length - 1) {
                    this.log('⏱️ Пауза между категориями...');
                    await this.delay(1000);
                }
                
            } catch (error) {
                this.log(`❌ Ошибка при парсинге фильтров категории ${categoryName}: ${error.message}`);
                allResults[categoryName] = {
                    url: categoryUrl,
                    sectionId: sectionId,
                    filters: [],
                    filtersCount: 0,
                    error: error.message
                };
                
                // Обновляем прогресс-бар даже при ошибке
                this.updateProgress(i + 1, 0);
            }
        }
        
        // Останавливаем прогресс-бар
        this.stopProgress();
        
        this.log(`\n🎉 Парсинг фильтров завершен! Всего фильтров: ${totalFilters}`);
        
        // Сохраняем общий отчет
        const report = {
            totalCategories: categories.length,
            totalFilters: totalFilters,
            categories: allResults,
            timestamp: new Date().toISOString()
        };
        
        await this.saveToFile(report, 'JSON/hotline-all-filters-report.json');
        this.log('📊 Отчет сохранен в JSON/hotline-all-filters-report.json');
        
        // Создаем общий CSV файл со всеми фильтрами
        this.log('📊 Создание общего CSV файла...');
        const allFilters = [];
        Object.keys(allResults).forEach(categoryName => {
            const result = allResults[categoryName];
            if (result.filters && result.filters.length > 0) {
                // Добавляем информацию о категории к каждому фильтру
                const filtersWithCategory = result.filters.map(filter => ({
                    ...filter,
                    category: categoryName,
                    categoryUrl: result.url,
                    sectionId: result.sectionId
                }));
                allFilters.push(...filtersWithCategory);
            }
        });
        
        if (allFilters.length > 0) {
            await this.saveToCSV(allFilters, 'CSV/hotline-all-filters.csv');
            this.log(`📊 Общий CSV файл создан: CSV/hotline-all-filters.csv (${allFilters.length} фильтров)`);
        }
        
        return allResults;
    }

    async saveToFile(data, filename) {
        try {
            await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
            this.log(`Данные сохранены в файл: ${filename}`);
        } catch (error) {
            this.log('Ошибка при сохранении файла: ' + error.message);
            throw error;
        }
    }

    async saveToCSV(filters, filename) {
        try {
            // Добавляем BOM для корректного отображения кириллицы в Excel
            const BOM = '\uFEFF';
            
            const csvHeader = BOM + 'ID,Название,Описание,Тип,Вес,Популярность,Публичный,Оборачиваемый,Исключаемый,Использует поиск значений,Категория,URL категории,Section ID,Количество значений,Количество товаров\n';
            
            const csvRows = filters.map(filter => {
                // Очищаем и экранируем данные
                const cleanText = (text) => {
                    if (!text) return '';
                    return text.toString()
                        .replace(/"/g, '""')  // Экранируем кавычки
                        .replace(/\n/g, ' ')  // Заменяем переносы строк
                        .replace(/\r/g, ' ')  // Заменяем возврат каретки
                        .replace(/\t/g, ' ')  // Заменяем табуляцию
                        .trim();
                };

                const valuesCount = filter.values ? filter.values.length : 0;
                const totalProductsCount = filter.values ? 
                    filter.values.reduce((sum, value) => sum + (value.totalProductsCount || 0), 0) : 0;
                
                return [
                    cleanText(filter._id),
                    `"${cleanText(filter.title)}"`,
                    `"${cleanText(filter.description)}"`,
                    cleanText(filter.type),
                    filter.weight || '',
                    filter.popularity || '',
                    filter.isPublic ? 'Да' : 'Нет',
                    filter.isWrappable ? 'Да' : 'Нет',
                    filter.isExcludable ? 'Да' : 'Нет',
                    filter.useValuesSearch ? 'Да' : 'Нет',
                    `"${cleanText(filter.category)}"`,
                    `"${cleanText(filter.categoryUrl)}"`,
                    filter.sectionId || '',
                    valuesCount,
                    totalProductsCount
                ].join(',');
            });

            const csvContent = csvHeader + csvRows.join('\n');
            await fs.writeFile(filename, csvContent, 'utf8');
            this.log(`Данные сохранены в CSV файл: ${filename}`);
        } catch (error) {
            this.log('Ошибка при сохранении CSV файла: ' + error.message);
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Обновление статистики запросов
    updateRequestStats(success) {
        this.requestStats.totalRequests++;
        
        if (success) {
            this.requestStats.successfulRequests++;
            this.requestStats.consecutiveErrors = 0;
        } else {
            this.requestStats.failedRequests++;
            this.requestStats.consecutiveErrors++;
            this.requestStats.lastErrorTime = Date.now();
        }
    }

    // Чтение категорий из файла
    async loadCategoriesFromFile(filename = './tctgr/categories.txt') {
        try {
            const content = await fs.readFile(filename, 'utf8');
            const categories = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#'))
                .filter(line => line.includes('hotline.ua'))
                .map(line => {
                    // Пытаемся извлечь sectionId из строки, если он есть
                    const sectionIdMatch = line.match(/sectionId[:\s]*(\d+)/i);
                    const sectionId = sectionIdMatch ? parseInt(sectionIdMatch[1]) : 386;
                    
                    return {
                        url: line,
                        sectionId: sectionId
                    };
                });
            
            this.log(`📁 Загружено ${categories.length} категорий из файла ${filename}`);
            return categories;
        } catch (error) {
            this.log(`❌ Ошибка при чтении файла категорий: ${error.message}`);
            throw error;
        }
    }

    // Метод для получения детальной информации о значениях фильтра
    async getFilterValuesDetails(filterId, categoryUrl = null) {
        this.log(`Получение деталей значений фильтра с ID: ${filterId}`);
        // Здесь можно добавить логику для получения детальной информации о значениях фильтра
    }

    // Метод для фильтрации фильтров по типу
    filterByType(filters, type) {
        return filters.filter(filter => filter.type === type);
    }

    // Метод для поиска фильтров по названию
    searchByName(filters, searchTerm) {
        const term = searchTerm.toLowerCase();
        return filters.filter(filter => 
            filter.title.toLowerCase().includes(term)
        );
    }
}

// Основная функция для запуска парсера фильтров
async function main() {
    const parser = new HotlineFiltersParser();
    
    // Настройки парсинга
    const PARSE_ALL_CATEGORIES = true; // Установите true для парсинга всех категорий из файла
    const SINGLE_CATEGORY_URL = 'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/'; // URL для парсинга одной категории
    const SINGLE_SECTION_ID = 386; // ID секции для одной категории
    const AUTO_GET_TOKENS = true; // Автоматическое получение токенов для каждой категории
    
    try {
        if (PARSE_ALL_CATEGORIES) {
            // Парсим фильтры всех категорий из файла
            parser.log('📁 Загружаем категории из файла...');
            const categories = await parser.loadCategoriesFromFile('categories.txt');
            
            if (categories.length === 0) {
                parser.log('❌ Не найдено категорий для парсинга');
                return;
            }
            
            // Парсим фильтры всех категорий
            const allResults = await parser.getAllCategoryFilters(categories, true, AUTO_GET_TOKENS);
            
            // Выводим итоговую статистику
            parser.log('\n📊 Итоговая статистика:');
            Object.keys(allResults).forEach(categoryName => {
                const result = allResults[categoryName];
                if (result.error) {
                    parser.log(`❌ ${categoryName}: ошибка - ${result.error}`);
                } else {
                    parser.log(`✅ ${categoryName}: ${result.filtersCount} фильтров`);
                }
            });
            
        } else {
            // Парсим фильтры одной категории
            parser.log('📦 Парсим фильтры одной категории...');
            const filters = await parser.getCategoryFilters(SINGLE_SECTION_ID, SINGLE_CATEGORY_URL);
            
            // Сохраняем в JSON
            const categoryName = parser.extractPathFromUrl(SINGLE_CATEGORY_URL);
            const jsonFilename = `JSON/hotline-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
            await parser.saveToFile(filters, jsonFilename);
            
            // Сохраняем в CSV
            const csvFilename = `CSV/hotline-filters-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
            await parser.saveToCSV(filters, csvFilename);
            
            // Примеры использования дополнительных методов
            parser.log('\n=== Примеры фильтрации ===');
            
            // Фильтр по типу
            const typeFilters = parser.filterByType(filters, 'checkbox');
            parser.log(`Фильтры типа checkbox: ${typeFilters.length}`);
            
            // Поиск по названию
            const searchResults = parser.searchByName(filters, 'память');
            parser.log(`Фильтры с "память" в названии: ${searchResults.length}`);
            
            // Выводим первые 5 фильтров для примера
            parser.log('\n=== Первые 5 фильтров ===');
            filters.slice(0, 5).forEach((filter, index) => {
                parser.log(`${index + 1}. ${filter.title} (${filter.type}) - ${filter.values ? filter.values.length : 0} значений`);
            });
        }
        
        // Выводим все накопленные логи
        parser.flushLogs();
        
    } catch (error) {
        parser.log('❌ Ошибка в main: ' + error.message);
        // Выводим все накопленные логи в случае ошибки
        parser.flushLogs();
    }
}

// Запускаем парсер, если файл запущен напрямую
if (require.main === module) {
    main();
}

module.exports = HotlineFiltersParser; 