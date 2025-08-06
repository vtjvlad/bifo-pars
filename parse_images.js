const fs = require('fs');

// Функция для парсинга JSON файла и извлечения ссылок
function parseImageLinks(jsonFilePath, outputFilePath) {
    try {
        // Читаем JSON файл
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(jsonData);
        
        const imageLinks = [];
        
        // Проходим по всем объектам в массиве
        data.forEach((item, index) => {
            // Извлекаем ссылки из imageLinks
            if (item.imageLinks && Array.isArray(item.imageLinks)) {
                item.imageLinks.forEach(imageLink => {
                    // Извлекаем ссылки из всех доступных полей
                    if (imageLink.big && typeof imageLink.big === 'string') {
                        imageLinks.push(imageLink.big);
                    }
                    if (imageLink.thumb && typeof imageLink.thumb === 'string') {
                        imageLinks.push(imageLink.thumb);
                    }
                    if (imageLink.basic && typeof imageLink.basic === 'string') {
                        imageLinks.push(imageLink.basic);
                    }
                    if (imageLink.small && typeof imageLink.small === 'string') {
                        imageLinks.push(imageLink.small);
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
        
        // Сохраняем в текстовый файл
        const outputContent = uniqueLinks.join('\n');
        fs.writeFileSync(outputFilePath, outputContent, 'utf8');
        
        console.log(`Обработано объектов: ${data.length}`);
        console.log(`Найдено уникальных ссылок: ${uniqueLinks.length}`);
        console.log(`Результат сохранен в файл: ${outputFilePath}`);
        
    } catch (error) {
        console.error('Ошибка при обработке файла:', error.message);
    }
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 1) {
    console.log('Использование: node parse_images.js <путь_к_json_файлу> [путь_к_выходному_файлу]');
    console.log('Пример: node parse_images.js test_struct_5_random.json image_links.txt');
    process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || 'image_links.txt';

// Проверяем существование входного файла
if (!fs.existsSync(inputFile)) {
    console.error(`Файл ${inputFile} не найден!`);
    process.exit(1);
}

// Запускаем парсинг
parseImageLinks(inputFile, outputFile); 