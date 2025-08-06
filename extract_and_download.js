const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Функция для парсинга JSON файла и извлечения ссылок
function parseImageLinks(jsonFilePath) {
    try {
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(jsonData);
        
        const imageLinks = [];
        
        data.forEach((item, index) => {
            // Извлекаем ссылки из imageLinks.big
            if (item.imageLinks && Array.isArray(item.imageLinks)) {
                item.imageLinks.forEach(imageLink => {
                    if (imageLink.big && typeof imageLink.big === 'string') {
                        imageLinks.push(imageLink.big);
                    }
                });
            }
            
            // Извлекаем ссылки из colorsProduct.pathImgBig
            if (item.colorsProduct && Array.isArray(item.colorsProduct)) {
                item.colorsProduct.forEach(colorProduct => {
                    if (colorProduct.pathImgBig && typeof colorProduct.pathImgBig === 'string') {
                        imageLinks.push(colorProduct.pathImgBig);
                    }
                });
            }
        });
        
        // Удаляем дубликаты
        const uniqueLinks = [...new Set(imageLinks)];
        
        console.log(`Обработано объектов: ${data.length}`);
        console.log(`Найдено уникальных ссылок: ${uniqueLinks.length}`);
        
        return uniqueLinks;
        
    } catch (error) {
        console.error('Ошибка при обработке JSON файла:', error.message);
        return [];
    }
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

// Функция для скачивания файла
function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        const request = protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                return;
            }

            ensureDirectoryExists(filePath);
            
            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(filePath, () => {});
                reject(err);
            });
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Функция для извлечения пути из URL
function extractPathFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname;
    } catch (error) {
        const match = url.match(/https?:\/\/[^\/]+(\/.*)/);
        return match ? match[1] : '/unknown';
    }
}

// Функция для скачивания всех изображений
async function downloadImages(links, outputDir) {
    try {
        console.log(`Найдено ${links.length} ссылок для скачивания`);
        
        let successCount = 0;
        let errorCount = 0;
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        for (let i = 0; i < links.length; i++) {
            const url = links[i].trim();
            if (!url) continue;
            
            try {
                const urlPath = extractPathFromUrl(url);
                const fileName = path.basename(urlPath) || 'image.jpg';
                const relativePath = path.dirname(urlPath);
                const fullOutputPath = path.join(outputDir, relativePath, fileName);
                
                console.log(`[${i + 1}/${links.length}] Скачиваю: ${url}`);
                console.log(`  → ${fullOutputPath}`);
                
                await downloadFile(url, fullOutputPath);
                successCount++;
                
                // Задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Ошибка при скачивании ${url}: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log('\n=== Результат скачивания ===');
        console.log(`Успешно скачано: ${successCount}`);
        console.log(`Ошибок: ${errorCount}`);
        console.log(`Всего обработано: ${links.length}`);
        
    } catch (error) {
        console.error('Ошибка при скачивании изображений:', error.message);
    }
}

// Основная функция
async function extractAndDownload(jsonFilePath, outputDir) {
    console.log('=== Этап 1: Извлечение ссылок из JSON ===');
    const links = parseImageLinks(jsonFilePath);
    
    if (links.length === 0) {
        console.error('Не найдено ссылок для скачивания!');
        return;
    }
    
    console.log('\n=== Этап 2: Скачивание изображений ===');
    await downloadImages(links, outputDir);
    
    console.log('\n=== Готово! ===');
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('Использование: node extract_and_download.js <json_файл> <папка_для_сохранения>');
    console.log('Пример: node extract_and_download.js test_struct_5_random.json downloaded_images');
    process.exit(1);
}

const jsonFile = args[0];
const outputDirectory = args[1];

// Проверяем существование JSON файла
if (!fs.existsSync(jsonFile)) {
    console.error(`Файл ${jsonFile} не найден!`);
    process.exit(1);
}

// Запускаем процесс
extractAndDownload(jsonFile, outputDirectory); 