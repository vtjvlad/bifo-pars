const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// CLI интерфейс
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        linksFile: null,
        outputDir: 'downloaded_images',
        timeout: 30000,
        delay: 100,
        maxRetries: 3,
        concurrent: 1,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '-h':
            case '--help':
                options.help = true;
                break;
            case '-o':
            case '--output':
                options.outputDir = args[++i];
                break;
            case '-t':
            case '--timeout':
                options.timeout = parseInt(args[++i]) * 1000;
                break;
            case '-d':
            case '--delay':
                options.delay = parseInt(args[++i]);
                break;
            case '-r':
            case '--retries':
                options.maxRetries = parseInt(args[++i]);
                break;
            case '-c':
            case '--concurrent':
                options.concurrent = parseInt(args[++i]);
                break;
            default:
                if (!options.linksFile) {
                    options.linksFile = arg;
                }
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Использование: node download_images.js <файл_со_ссылками> [опции]

Аргументы:
  <файл_со_ссылками>    Путь к файлу со списком ссылок на изображения

Опции:
  -h, --help            Показать эту справку
  -o, --output <dir>    Папка для сохранения изображений (по умолчанию: downloaded_images)
  -t, --timeout <sec>   Таймаут для каждого запроса в секундах (по умолчанию: 30)
  -d, --delay <ms>      Задержка между запросами в миллисекундах (по умолчанию: 100)
  -r, --retries <num>   Максимальное количество повторных попыток (по умолчанию: 3)
  -c, --concurrent <num> Количество одновременных загрузок (по умолчанию: 1)

Примеры:
  node download_images.js image_links.txt
  node download_images.js image_links.txt -o images -t 60 -d 200
  node download_images.js image_links.txt --output ./photos --timeout 45 --delay 500
`);
}

// Функция для создания папок рекурсивно
function ensureDirectoryExists(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExists(dirname);
    fs.mkdirSync(dirname);
}

// Функция для скачивания файла с повторными попытками
function downloadFile(url, filePath, timeout, maxRetries) {
    return new Promise(async (resolve, reject) => {
        let attempts = 0;
        
        const attemptDownload = () => {
            attempts++;
            
            const protocol = url.startsWith('https:') ? https : http;
            
            const request = protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    const error = new Error(`HTTP ${response.statusCode}: ${url}`);
                    if (attempts < maxRetries) {
                        console.log(`  Повторная попытка ${attempts}/${maxRetries} для ${url}`);
                        setTimeout(attemptDownload, 1000 * attempts);
                    } else {
                        reject(error);
                    }
                    return;
                }

                // Создаем папки если их нет
                ensureDirectoryExists(filePath);
                
                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });

                fileStream.on('error', (err) => {
                    fs.unlink(filePath, () => {}); // Удаляем файл при ошибке
                    if (attempts < maxRetries) {
                        console.log(`  Повторная попытка ${attempts}/${maxRetries} для ${url}`);
                        setTimeout(attemptDownload, 1000 * attempts);
                    } else {
                        reject(err);
                    }
                });
            });

            request.on('error', (err) => {
                if (attempts < maxRetries) {
                    console.log(`  Повторная попытка ${attempts}/${maxRetries} для ${url}`);
                    setTimeout(attemptDownload, 1000 * attempts);
                } else {
                    reject(err);
                }
            });

            request.setTimeout(timeout, () => {
                request.destroy();
                if (attempts < maxRetries) {
                    console.log(`  Повторная попытка ${attempts}/${maxRetries} для ${url} (таймаут)`);
                    setTimeout(attemptDownload, 1000 * attempts);
                } else {
                    reject(new Error('Timeout'));
                }
            });
        };
        
        attemptDownload();
    });
}

// Функция для извлечения пути из URL
function extractPathFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname;
    } catch (error) {
        // Если URL некорректный, извлекаем путь после домена
        const match = url.match(/https?:\/\/[^\/]+(\/.*)/);
        return match ? match[1] : '/unknown';
    }
}

// Функция для скачивания изображения с обработкой ошибок
async function downloadSingleImage(url, outputDir, options, index, total) {
    try {
        // Извлекаем путь из URL
        const urlPath = extractPathFromUrl(url);
        
        // Создаем полный путь к файлу
        const fileName = path.basename(urlPath) || 'image.jpg';
        const relativePath = path.dirname(urlPath);
        const fullOutputPath = path.join(outputDir, relativePath, fileName);
        
        console.log(`[${index + 1}/${total}] Скачиваю: ${url}`);
        console.log(`  → ${fullOutputPath}`);
        
        await downloadFile(url, fullOutputPath, options.timeout, options.maxRetries);
        
        // Задержка между запросами
        if (options.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        
        return { success: true, url };
    } catch (error) {
        console.error(`Ошибка при скачивании ${url}: ${error.message}`);
        return { success: false, url, error: error.message };
    }
}

// Функция для скачивания всех изображений
async function downloadImages(options) {
    try {
        // Читаем файл со ссылками
        const linksContent = fs.readFileSync(options.linksFile, 'utf8');
        const links = linksContent.split('\n').filter(link => link.trim() !== '');
        
        console.log(`Найдено ${links.length} ссылок для скачивания`);
        console.log(`Параметры:`);
        console.log(`  Папка: ${options.outputDir}`);
        console.log(`  Таймаут: ${options.timeout / 1000}с`);
        console.log(`  Задержка: ${options.delay}мс`);
        console.log(`  Повторные попытки: ${options.maxRetries}`);
        console.log(`  Одновременные загрузки: ${options.concurrent}`);
        console.log('');
        
        // Создаем основную папку если её нет
        if (!fs.existsSync(options.outputDir)) {
            fs.mkdirSync(options.outputDir, { recursive: true });
        }
        
        let successCount = 0;
        let errorCount = 0;
        const results = [];
        
        // Скачиваем изображения
        if (options.concurrent === 1) {
            // Последовательная загрузка
            for (let i = 0; i < links.length; i++) {
                const url = links[i].trim();
                if (!url) continue;
                
                const result = await downloadSingleImage(url, options.outputDir, options, i, links.length);
                results.push(result);
                
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }
        } else {
            // Параллельная загрузка
            const chunks = [];
            for (let i = 0; i < links.length; i += options.concurrent) {
                chunks.push(links.slice(i, i + options.concurrent));
            }
            
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                const promises = chunk.map((url, index) => {
                    const globalIndex = chunkIndex * options.concurrent + index;
                    return downloadSingleImage(url.trim(), options.outputDir, options, globalIndex, links.length);
                });
                
                const chunkResults = await Promise.all(promises);
                results.push(...chunkResults);
                
                for (const result of chunkResults) {
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                }
            }
        }
        
        console.log('\n=== Результат скачивания ===');
        console.log(`Успешно скачано: ${successCount}`);
        console.log(`Ошибок: ${errorCount}`);
        console.log(`Всего обработано: ${links.length}`);
        
    } catch (error) {
        console.error('Ошибка при обработке файла со ссылками:', error.message);
    }
}

// Основная функция
function main() {
    const options = parseArguments();
    
    if (options.help) {
        showHelp();
        return;
    }
    
    if (!options.linksFile) {
        console.error('Ошибка: Не указан файл со ссылками!');
        console.log('Используйте --help для получения справки');
        process.exit(1);
    }
    
    // Проверяем существование файла со ссылками
    if (!fs.existsSync(options.linksFile)) {
        console.error(`Файл ${options.linksFile} не найден!`);
        process.exit(1);
    }
    
    // Запускаем скачивание
    downloadImages(options);
}

// Запускаем программу
main(); 