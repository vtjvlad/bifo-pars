const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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
        // Если URL некорректный, извлекаем путь после домена
        const match = url.match(/https?:\/\/[^\/]+(\/.*)/);
        return match ? match[1] : '/unknown';
    }
}

// Функция для скачивания всех изображений
async function downloadImages(linksFilePath, outputDir) {
    try {
        // Читаем файл со ссылками
        const linksContent = fs.readFileSync(linksFilePath, 'utf8');
        const links = linksContent.split('\n').filter(link => link.trim() !== '');
        
        console.log(`Найдено ${links.length} ссылок для скачивания`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Создаем основную папку если её нет
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Скачиваем каждое изображение
        for (let i = 0; i < links.length; i++) {
            const url = links[i].trim();
            if (!url) continue;
            
            try {
                // Извлекаем путь из URL
                const urlPath = extractPathFromUrl(url);
                
                // Создаем полный путь к файлу
                const fileName = path.basename(urlPath) || 'image.jpg';
                const relativePath = path.dirname(urlPath);
                const fullOutputPath = path.join(outputDir, relativePath, fileName);
                
                console.log(`[${i + 1}/${links.length}] Скачиваю: ${url}`);
                console.log(`  → ${fullOutputPath}`);
                
                await downloadFile(url, fullOutputPath);
                successCount++;
                
                // Небольшая задержка между запросами
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
        console.error('Ошибка при обработке файла со ссылками:', error.message);
    }
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('Использование: node download_images.js <файл_со_ссылками> <папка_для_сохранения>');
    console.log('Пример: node download_images.js image_links.txt downloaded_images');
    process.exit(1);
}

const linksFile = args[0];
const outputDirectory = args[1];

// Проверяем существование файла со ссылками
if (!fs.existsSync(linksFile)) {
    console.error(`Файл ${linksFile} не найден!`);
    process.exit(1);
}

// Запускаем скачивание
downloadImages(linksFile, outputDirectory); 