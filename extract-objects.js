#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для получения аргументов командной строки
function getArguments() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('Использование: node extract-objects.js <путь_к_файлу> <количество_объектов> <порядок>');
        console.log('Порядок может быть: first, last, random');
        console.log('Пример: node extract-objects.js data.json 10 first');
        process.exit(1);
    }
    
    return {
        filePath: args[0],
        count: parseInt(args[1]),
        order: args[2]
    };
}

// Функция для извлечения объектов
function extractObjects(data, count, order) {
    if (!Array.isArray(data)) {
        console.error('Ошибка: JSON файл должен содержать массив объектов');
        process.exit(1);
    }
    
    const totalObjects = data.length;
    
    if (count > totalObjects) {
        console.log(`Предупреждение: запрошено ${count} объектов, но в файле только ${totalObjects}`);
        count = totalObjects;
    }
    
    let selectedObjects = [];
    
    switch (order.toLowerCase()) {
        case 'first':
            selectedObjects = data.slice(0, count);
            break;
            
        case 'last':
            selectedObjects = data.slice(-count);
            break;
            
        case 'random':
            // Создаем копию массива и перемешиваем
            const shuffled = [...data].sort(() => Math.random() - 0.5);
            selectedObjects = shuffled.slice(0, count);
            break;
            
        default:
            console.error('Ошибка: неверный порядок. Используйте: first, last, random');
            process.exit(1);
    }
    
    return selectedObjects;
}

// Функция для сохранения результата
function saveResult(objects, originalFilePath) {
    const dir = path.dirname(originalFilePath);
    const name = path.basename(originalFilePath, path.extname(originalFilePath));
    const outputPath = path.join(dir, `${name}_extracted_${objects.length}.json`);
    
    try {
        fs.writeFileSync(outputPath, JSON.stringify(objects, null, 2), 'utf8');
        console.log(`Результат сохранен в: ${outputPath}`);
        console.log(`Извлечено объектов: ${objects.length}`);
    } catch (error) {
        console.error('Ошибка при сохранении файла:', error.message);
        process.exit(1);
    }
}

// Основная функция
function main() {
    try {
        const { filePath, count, order } = getArguments();
        
        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
            console.error(`Ошибка: файл ${filePath} не найден`);
            process.exit(1);
        }
        
        // Читаем JSON файл
        console.log(`Читаем файл: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        console.log(`Всего объектов в файле: ${data.length}`);
        console.log(`Извлекаем ${count} объектов (${order})`);
        
        // Извлекаем объекты
        const extractedObjects = extractObjects(data, count, order);
        
        // Сохраняем результат
        saveResult(extractedObjects, filePath);
        
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Ошибка: неверный формат JSON файла');
        } else {
            console.error('Ошибка:', error.message);
        }
        process.exit(1);
    }
}

// Запускаем скрипт
main(); 