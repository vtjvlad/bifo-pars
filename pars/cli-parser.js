#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');

// Исправляем импорт ora для совместимости
let ora = require('ora');
if (typeof ora !== 'function' && ora.default) ora = ora.default;

// Исправляем импорт figlet для совместимости
let figlet = require('figlet');
if (typeof figlet !== 'function' && figlet.default) figlet = figlet.default;

// Исправляем импорт boxen для совместимости
let boxen = require('boxen');
if (typeof boxen !== 'function' && boxen.default) boxen = boxen.default;

const cliProgress = require('cli-progress');
const HotlineParser = require('./hotline-parser');

// Проверяем версию chalk и настраиваем соответственно
if (chalk.level > 0) {
    // chalk v4+ (CommonJS)
    chalk.level = 3; // Включаем все цвета
} else {
    // chalk v5+ (ESM) - используем fallback
    console.log('⚠️  Рекомендуется установить chalk v4: npm install chalk@4.1.2');
}

class HotlineCLI {
    constructor() {
        this.parser = new HotlineParser();
        this.config = {
            batchSize: 15,
            autoGetTokens: true,
            saveProgressively: true,
            saveInterval: 25,
            testPerformance: false,
            maxBatchSize: 25
        };
        this.selectedCategoriesFile = 'tctgr/categories.txt'; // Файл по умолчанию
    }

    // Показываем красивый заголовок
    showHeader() {
        console.clear();
        
        // Добавляем отступы для увеличения области взаимодействия
        console.log('\n'.repeat(2));
        
        console.log(
            chalk.cyan(
                figlet.textSync('Hotline Parser', { 
                    horizontalLayout: 'full',
                    font: 'Standard'
                })
            )
        );
        
        console.log(
            boxen(
                chalk.yellow('🚀 Мультикатегорийный парсер Hotline.ua с батчевой обработкой'),
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: 'round',
                    borderColor: 'cyan'
                }
            )
        );
        
        // Добавляем дополнительный отступ
        console.log('\n');
    }

    // Главное меню
    async showMainMenu() {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Выберите действие:',
                choices: [
                    { name: '📦 Парсить все категории из файла', value: 'parse_all' },
                    { name: '📁 Выбрать файл с категориями', value: 'select_file' },
                    { name: '🎯 Парсить одну категорию', value: 'parse_single' },
                    { name: '⚙️  Настройки', value: 'settings' },
                    { name: '🧪 Тестирование производительности', value: 'test_performance' },
                    { name: '🔑 Тестирование токенов', value: 'test_tokens' },
                    { name: '📊 Статистика и отчеты', value: 'reports' },
                    { name: '❌ Выход', value: 'exit' }
                ],
                pageSize: 15
            }
        ]);

        switch (action) {
            case 'parse_all':
                await this.parseAllCategories();
                break;
            case 'select_file':
                await this.selectCategoriesFile();
                break;
            case 'parse_single':
                await this.parseSingleCategory();
                break;
            case 'settings':
                await this.showSettings();
                break;
            case 'test_performance':
                await this.testPerformance();
                break;
            case 'test_tokens':
                await this.testTokens();
                break;
            case 'reports':
                await this.showReports();
                break;
            case 'exit':
                this.exit();
                break;
        }
    }

    // Выбор файла с категориями
    async selectCategoriesFile() {
        this.showHeader();
        console.log(chalk.blue('📁 Выбор файла с категориями'));
        console.log('\n');

        const { selectionType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectionType',
                message: 'Выберите тип выбора:',
                choices: [
                    { name: '📄 Выбрать одну категорию', value: 'single' },
                    { name: '📦 Выбрать несколько файлов', value: 'multiple' },
                    { name: '🔙 Назад', value: 'back' }
                ]
            }
        ]);

        if (selectionType === 'back') {
            return;
        } else if (selectionType === 'single') {
            await this.selectSingleFile();
        } else if (selectionType === 'multiple') {
            await this.selectMultipleFiles();
        }
    }

    // Выбор одного файла (текущая функциональность)
    async selectSingleFile() {
        this.showHeader();
        console.log(chalk.blue('📄 Выбор одного файла с категориями'));
        console.log('\n');

        const fs = require('fs').promises;
        const path = require('path');

        try {
            // Получаем список файлов в директории tctgr и подпапках
            let allFiles = [];
            try {
                allFiles = await this.getAllFilesInDirectory('tctgr');
            } catch (error) {
                console.log(chalk.yellow('⚠️  Директория tctgr не найдена, создаем...'));
                await fs.mkdir('tctgr', { recursive: true });
            }

            // Фильтруем только нужные типы файлов
            const files = allFiles.filter(file => 
                file.endsWith('.txt') || 
                file.endsWith('.csv') || 
                file.endsWith('.json')
            );

            // Группируем файлы по папкам
            const groupedFiles = this.groupFilesByFolder(files);

            // Создаем список выбора с группировкой
            const choices = [];
            
            // Добавляем файлы из корневой папки
            if (groupedFiles.root && groupedFiles.root.length > 0) {
                choices.push({ name: '📂 Корневая папка', value: 'separator', disabled: true });
                groupedFiles.root.forEach(file => {
                    choices.push({ 
                        name: `   📄 ${file}`, 
                        value: file 
                    });
                });
            }

            // Добавляем файлы из подпапок
            Object.keys(groupedFiles).forEach(folder => {
                if (folder !== 'root' && groupedFiles[folder].length > 0) {
                    choices.push({ name: `📁 ${folder}`, value: 'separator', disabled: true });
                    groupedFiles[folder].forEach(file => {
                        choices.push({ 
                            name: `   📄 ${file}`, 
                            value: `${folder}/${file}` 
                        });
                    });
                }
            });

            // Добавляем опции действий
            choices.push(
                { name: '📝 Ввести путь к файлу вручную', value: 'manual' },
                { name: '🔙 Назад', value: 'back' }
            );

            if (choices.length === 1) {
                choices.unshift({ name: '📝 Ввести путь к файлу вручную', value: 'manual' });
            }

            const { selectedFile } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedFile',
                    message: 'Выберите файл с категориями:',
                    choices: choices,
                    pageSize: 20
                }
            ]);

            if (selectedFile === 'back') {
                return;
            }

            let filePath;
            if (selectedFile === 'manual') {
                const { manualPath } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'manualPath',
                        message: 'Введите путь к файлу:',
                        default: this.selectedCategoriesFile,
                        validate: (input) => {
                            if (!input.trim()) {
                                return 'Путь не может быть пустым';
                            }
                            return true;
                        }
                    }
                ]);
                filePath = manualPath.trim();
            } else if (selectedFile === 'separator') {
                // Пропускаем разделители
                return;
            } else {
                // Добавляем префикс tctgr/ если путь не содержит его
                filePath = selectedFile.startsWith('tctgr/') ? selectedFile : `tctgr/${selectedFile}`;
            }

            // Проверяем существование файла
            try {
                await fs.access(filePath);
                this.selectedCategoriesFile = filePath;
                console.log(chalk.green(`✅ Выбран файл: ${filePath}`));
                
                // Показываем содержимое файла
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim().length > 0);
                const validUrls = lines.filter(line => line.includes('hotline.ua'));
                
                console.log(chalk.cyan(`📊 Статистика файла:`));
                console.log(chalk.cyan(`   Всего строк: ${lines.length}`));
                console.log(chalk.cyan(`   Валидных URL: ${validUrls.length}`));
                
                if (validUrls.length === 0) {
                    console.log(chalk.yellow('⚠️  В файле нет валидных URL hotline.ua'));
                } else {
                    // Предлагаем запустить парсинг
                    const { startParsing } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'startParsing',
                            message: 'Запустить парсинг выбранного файла?',
                            default: true
                        }
                    ]);
                    
                    if (startParsing) {
                        console.log('');
                        await this.parseSelectedFile();
                    }
                }

            } catch (error) {
                console.log(chalk.red(`❌ Файл не найден: ${filePath}`));
                console.log(chalk.yellow('Проверьте правильность пути'));
            }

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Выбор нескольких файлов
    async selectMultipleFiles() {
        this.showHeader();
        console.log(chalk.blue('📦 Выбор нескольких файлов с категориями'));
        console.log('\n');

        const fs = require('fs').promises;
        const path = require('path');

        try {
            // Получаем список файлов в директории tctgr и подпапках
            let allFiles = [];
            try {
                allFiles = await this.getAllFilesInDirectory('tctgr');
            } catch (error) {
                console.log(chalk.yellow('⚠️  Директория tctgr не найдена, создаем...'));
                await fs.mkdir('tctgr', { recursive: true });
            }

            // Фильтруем только нужные типы файлов
            const files = allFiles.filter(file => 
                file.endsWith('.txt') || 
                file.endsWith('.csv') || 
                file.endsWith('.json')
            );

            if (files.length === 0) {
                console.log(chalk.yellow('📁 Нет доступных файлов для выбора'));
                console.log(chalk.cyan('Создайте файлы с категориями в папке tctgr/'));
                await this.waitForEnter();
                return;
            }

            // Группируем файлы по папкам
            const groupedFiles = this.groupFilesByFolder(files);

            // Создаем список чекбоксов с группировкой
            const choices = [];
            
            // Добавляем файлы из корневой папки
            if (groupedFiles.root && groupedFiles.root.length > 0) {
                choices.push(new inquirer.Separator('📂 Корневая папка'));
                groupedFiles.root.forEach(file => {
                    choices.push({ 
                        name: `📄 ${file}`, 
                        value: file,
                        checked: false
                    });
                });
            }

            // Добавляем файлы из подпапок
            Object.keys(groupedFiles).forEach(folder => {
                if (folder !== 'root' && groupedFiles[folder].length > 0) {
                    choices.push(new inquirer.Separator(`📁 ${folder}`));
                    groupedFiles[folder].forEach(file => {
                        choices.push({ 
                            name: `📄 ${file}`, 
                            value: `${folder}/${file}`,
                            checked: false
                        });
                    });
                }
            });

            // Добавляем опции действий
            choices.push(
                new inquirer.Separator('Действия'),
                { name: '✅ Выбрать все файлы', value: 'select_all' },
                { name: '❌ Снять выбор со всех', value: 'deselect_all' },
                { name: '📝 Добавить файл вручную', value: 'manual' }
            );

            const { selectedFiles } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedFiles',
                    message: 'Выберите файлы с категориями (пробел для выбора):',
                    choices: choices,
                    pageSize: 25,
                    validate: (input) => {
                        if (input.length === 0) {
                            return 'Выберите хотя бы один файл';
                        }
                        return true;
                    }
                }
            ]);

            if (selectedFiles.length === 0) {
                console.log(chalk.yellow('⚠️  Файлы не выбраны'));
                await this.waitForEnter();
                return;
            }

            // Обрабатываем специальные действия
            let finalFiles = [];
            for (const file of selectedFiles) {
                if (file === 'select_all') {
                    // Выбираем все файлы
                    finalFiles = files.map(f => f.startsWith('tctgr/') ? f : `tctgr/${f}`);
                    break;
                } else if (file === 'deselect_all') {
                    // Снимаем выбор со всех
                    finalFiles = [];
                    break;
                } else if (file === 'manual') {
                    // Добавляем файл вручную
                    const { manualPath } = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'manualPath',
                            message: 'Введите путь к файлу:',
                            validate: (input) => {
                                if (!input.trim()) {
                                    return 'Путь не может быть пустым';
                                }
                                return true;
                            }
                        }
                    ]);
                    const manualFilePath = manualPath.trim();
                    if (!finalFiles.includes(manualFilePath)) {
                        finalFiles.push(manualFilePath);
                    }
                } else {
                    // Обычный файл
                    const filePath = file.startsWith('tctgr/') ? file : `tctgr/${file}`;
                    if (!finalFiles.includes(filePath)) {
                        finalFiles.push(filePath);
                    }
                }
            }

            // Убираем дубликаты
            finalFiles = [...new Set(finalFiles)];

            if (finalFiles.length === 0) {
                console.log(chalk.yellow('⚠️  Файлы не выбраны'));
                await this.waitForEnter();
                return;
            }

            // Проверяем существование файлов и показываем статистику
            console.log(chalk.green(`✅ Выбрано ${finalFiles.length} файлов:`));
            
            let totalUrls = 0;
            const validFiles = [];
            
            for (const filePath of finalFiles) {
                try {
                    await fs.access(filePath);
                    const content = await fs.readFile(filePath, 'utf8');
                    const lines = content.split('\n').filter(line => line.trim().length > 0);
                    const validUrls = lines.filter(line => line.includes('hotline.ua'));
                    
                    console.log(chalk.cyan(`   📄 ${filePath}: ${validUrls.length} URL`));
                    totalUrls += validUrls.length;
                    validFiles.push(filePath);
                    
                } catch (error) {
                    console.log(chalk.red(`   ❌ ${filePath}: файл не найден`));
                }
            }

            console.log('');
            console.log(chalk.blue(`📊 Общая статистика:`));
            console.log(chalk.cyan(`   Файлов: ${validFiles.length}`));
            console.log(chalk.green(`   Всего URL: ${totalUrls}`));

            if (validFiles.length === 0) {
                console.log(chalk.red('❌ Нет валидных файлов для парсинга'));
                await this.waitForEnter();
                return;
            }

            // Предлагаем запустить парсинг
            const { startParsing } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'startParsing',
                    message: `Запустить парсинг ${validFiles.length} файлов?`,
                    default: true
                }
            ]);
            
            if (startParsing) {
                console.log('');
                await this.parseMultipleFiles(validFiles);
            }

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Парсинг всех категорий
    async parseAllCategories() {
        this.showHeader();
        console.log(chalk.blue('📦 Парсинг всех категорий из файла'));
        console.log(chalk.cyan(`📁 Используется файл: ${this.selectedCategoriesFile}`));
        console.log('\n');

        try {
            // Проверяем наличие файла категорий
            const fs = require('fs').promises;
            let categories;
            
            try {
                const content = await fs.readFile(this.selectedCategoriesFile, 'utf8');
                categories = content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'))
                    .filter(line => line.includes('hotline.ua'));
            } catch (error) {
                console.log(chalk.red(`❌ Файл ${this.selectedCategoriesFile} не найден!`));
                console.log(chalk.yellow('Используйте "Выбрать файл с категориями" для выбора другого файла'));
                await this.waitForEnter();
                return;
            }

            if (categories.length === 0) {
                console.log(chalk.red('❌ В файле categories.txt нет валидных URL!'));
                await this.waitForEnter();
                return;
            }

            console.log(chalk.green(`✅ Найдено ${categories.length} категорий:`));
            categories.forEach((url, index) => {
                const categoryName = this.parser.extractPathFromUrl(url);
                console.log(chalk.cyan(`   ${index + 1}. ${categoryName}`));
            });

            console.log('');
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Начать парсинг всех категорий?',
                    default: true
                }
            ]);

            if (!confirm) {
                return;
            }

            // Показываем прогресс
            const spinner = ora('🚀 Запуск парсера...').start();
            
            const results = await this.parser.parseAllCategories(
                categories, 
                this.config.saveProgressively, 
                this.config.batchSize, 
                this.config.autoGetTokens
            );

            spinner.succeed('✅ Парсинг завершен!');

            // Показываем результаты
            this.showParseResults(results);

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Парсинг одной категории
    async parseSingleCategory() {
        this.showHeader();
        console.log(chalk.blue('🎯 Парсинг одной категории'));
        console.log('\n');

        const { categoryUrl } = await inquirer.prompt([
            {
                type: 'input',
                name: 'categoryUrl',
                message: 'Введите URL категории:',
                default: 'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/',
                validate: (input) => {
                    if (!input.includes('hotline.ua')) {
                        return 'URL должен содержать hotline.ua';
                    }
                    return true;
                }
            }
        ]);

        try {
            const spinner = ora('🚀 Запуск парсера...').start();
            
            const products = await this.parser.getAllProducts(
                this.config.saveProgressively,
                this.config.saveInterval,
                this.config.batchSize,
                categoryUrl
            );

            spinner.succeed(`✅ Парсинг завершен! Получено ${products.length} товаров`);

            // Показываем статистику
            this.showProductStats(products);

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Настройки
    async showSettings() {
        this.showHeader();
        console.log(chalk.blue('⚙️  Настройки парсера'));
        console.log('\n');

        const { setting } = await inquirer.prompt([
            {
                type: 'list',
                name: 'setting',
                message: 'Выберите настройку для изменения:',
                choices: [
                    { name: `📊 Размер батча: ${this.config.batchSize}`, value: 'batch_size' },
                    { name: `🔑 Автополучение токенов: ${this.config.autoGetTokens ? 'ВКЛ' : 'ВЫКЛ'}`, value: 'auto_tokens' },
                    { name: `💾 Постепенное сохранение: ${this.config.saveProgressively ? 'ВКЛ' : 'ВЫКЛ'}`, value: 'save_progressive' },
                    { name: `⏱️  Интервал сохранения: ${this.config.saveInterval}`, value: 'save_interval' },
                    { name: `🧪 Максимальный размер батча для тестов: ${this.config.maxBatchSize}`, value: 'max_batch' },
                    { name: '🔙 Назад', value: 'back' }
                ],
                pageSize: 15
            }
        ]);

        switch (setting) {
            case 'batch_size':
                await this.changeBatchSize();
                break;
            case 'auto_tokens':
                await this.toggleAutoTokens();
                break;
            case 'save_progressive':
                await this.toggleSaveProgressive();
                break;
            case 'save_interval':
                await this.changeSaveInterval();
                break;
            case 'max_batch':
                await this.changeMaxBatchSize();
                break;
            case 'back':
                return;
        }

        await this.showSettings();
    }

    // Изменение размера батча
    async changeBatchSize() {
        const { batchSize } = await inquirer.prompt([
            {
                type: 'number',
                name: 'batchSize',
                message: 'Введите размер батча (5-50):',
                default: this.config.batchSize,
                validate: (input) => {
                    if (input < 1 || input > 50) {
                        return 'Размер батча должен быть от 1 до 50';
                    }
                    return true;
                }
            }
        ]);

        this.config.batchSize = batchSize;
        console.log(chalk.green(`✅ Размер батча изменен на ${batchSize}`));
    }

    // Переключение автополучения токенов
    async toggleAutoTokens() {
        const { autoTokens } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'autoTokens',
                message: 'Включить автоматическое получение токенов для каждой категории?',
                default: this.config.autoGetTokens
            }
        ]);

        this.config.autoGetTokens = autoTokens;
        console.log(chalk.green(`✅ Автополучение токенов: ${autoTokens ? 'ВКЛ' : 'ВЫКЛ'}`));
    }

    // Переключение постепенного сохранения
    async toggleSaveProgressive() {
        const { saveProgressive } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'saveProgressive',
                message: 'Включить постепенное сохранение данных?',
                default: this.config.saveProgressively
            }
        ]);

        this.config.saveProgressively = saveProgressive;
        console.log(chalk.green(`✅ Постепенное сохранение: ${saveProgressive ? 'ВКЛ' : 'ВЫКЛ'}`));
    }

    // Изменение интервала сохранения
    async changeSaveInterval() {
        const { saveInterval } = await inquirer.prompt([
            {
                type: 'number',
                name: 'saveInterval',
                message: 'Введите интервал сохранения (страниц):',
                default: this.config.saveInterval,
                validate: (input) => {
                    if (input < 1) {
                        return 'Интервал должен быть больше 0';
                    }
                    return true;
                }
            }
        ]);

        this.config.saveInterval = saveInterval;
        console.log(chalk.green(`✅ Интервал сохранения изменен на ${saveInterval}`));
    }

    // Изменение максимального размера батча для тестов
    async changeMaxBatchSize() {
        const { maxBatchSize } = await inquirer.prompt([
            {
                type: 'number',
                name: 'maxBatchSize',
                message: 'Введите максимальный размер батча для тестов (5-50):',
                default: this.config.maxBatchSize,
                validate: (input) => {
                    if (input < 5 || input > 50) {
                        return 'Максимальный размер батча должен быть от 5 до 50';
                    }
                    return true;
                }
            }
        ]);

        this.config.maxBatchSize = maxBatchSize;
        console.log(chalk.green(`✅ Максимальный размер батча изменен на ${maxBatchSize}`));
    }

    // Тестирование производительности
    async testPerformance() {
        this.showHeader();
        console.log(chalk.blue('🧪 Тестирование производительности'));
        console.log('\n');

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Запустить тестирование производительности с разными размерами батчей?',
                default: true
            }
        ]);

        if (!confirm) {
            return;
        }

        try {
            const spinner = ora('🧪 Тестирование производительности...').start();
            
            const results = await this.parser.testBatchPerformance(this.config.maxBatchSize);
            
            spinner.succeed('✅ Тестирование завершено!');

            // Показываем результаты
            this.showPerformanceResults(results);

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Тестирование токенов
    async testTokens() {
        this.showHeader();
        console.log(chalk.blue('🔑 Тестирование токенов'));
        console.log('\n');

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Запустить тестирование получения токенов для разных категорий?',
                default: true
            }
        ]);

        if (!confirm) {
            return;
        }

        try {
            // Импортируем тестовый файл
            const testTokens = require('./test-tokens');
            await testTokens();

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Показ отчетов
    async showReports() {
        this.showHeader();
        console.log(chalk.blue('📊 Статистика и отчеты'));
        console.log('\n');

        const fs = require('fs').promises;
        
        try {
            // Анализируем JSON файлы для получения статистики
            const jsonFiles = await this.getFilesInDirectory('JSON');

            if (jsonFiles.length === 0) {
                console.log(chalk.yellow('📁 Нет JSON файлов для анализа'));
                console.log(chalk.cyan('Сначала запустите парсинг категорий'));
            } else {
                // Сначала показываем файлы
            console.log(chalk.green('📁 JSON файлы:'));
                jsonFiles.forEach(file => {
                    console.log(chalk.cyan(`   📄 ${file}`));
                });

                const csvFiles = await this.getFilesInDirectory('CSV');
                if (csvFiles.length > 0) {
            console.log('');
            console.log(chalk.green('📁 CSV файлы:'));
                csvFiles.forEach(file => {
                    console.log(chalk.cyan(`   📊 ${file}`));
                });
                }

                console.log('');
                console.log(chalk.blue('📊 Анализ данных...'));
                
                let totalCategories = 0;
                let totalProducts = 0;
                const categoryStats = [];

                // Анализируем каждый JSON файл
                for (const file of jsonFiles) {
                    try {
                        const filePath = `JSON/${file}`;
                        const content = await fs.readFile(filePath, 'utf8');
                        const data = JSON.parse(content);

                        if (Array.isArray(data)) {
                            // Если это массив товаров
                            const categoryName = file.replace('.json', '');
                            const productCount = data.length;
                            
                            categoryStats.push({
                                name: categoryName,
                                count: productCount,
                                file: file
                            });
                            
                            totalCategories++;
                            totalProducts += productCount;
                        } else if (typeof data === 'object') {
                            // Если это объект с категориями
                            Object.keys(data).forEach(categoryName => {
                                const categoryData = data[categoryName];
                                let productCount = 0;
                                
                                if (Array.isArray(categoryData)) {
                                    productCount = categoryData.length;
                                } else if (categoryData && typeof categoryData === 'object' && categoryData.products) {
                                    productCount = Array.isArray(categoryData.products) ? categoryData.products.length : 0;
                                }
                                
                                categoryStats.push({
                                    name: categoryName,
                                    count: productCount,
                                    file: file
                                });
                                
                                totalCategories++;
                                totalProducts += productCount;
                            });
                        }
                    } catch (error) {
                        console.log(chalk.red(`❌ Ошибка при чтении файла ${file}: ${error.message}`));
                    }
                }

                // Сортируем по количеству товаров (по убыванию)
                categoryStats.sort((a, b) => b.count - a.count);

                console.log('');
                console.log(chalk.green('📊 Статистика по категориям:'));
                console.log('');

                // Показываем статистику по категориям
                console.log(chalk.cyan(`   Найдено ${categoryStats.length} категорий`));
                console.log(chalk.yellow('   Используйте стрелки для прокрутки, Enter для выбора, q для выхода'));
                console.log('');

                // Создаем интерактивный список категорий
                const choices = categoryStats.map((stat, index) => {
                    const color = stat.count > 100 ? 'green' : stat.count > 50 ? 'yellow' : 'cyan';
                    const icon = stat.count === 0 ? '❌' : stat.count > 100 ? '🟢' : stat.count > 50 ? '🟡' : '🔵';
                    return {
                        name: `${icon} ${stat.name}: ${stat.count} товаров`,
                        value: index,
                        short: `${stat.name} (${stat.count})`
                    };
                });

                // Добавляем опции действий
                choices.push(
                    {
                        name: '💾 Сохранить пустые категории в файл',
                        value: 'save_empty',
                        short: 'Сохранить пустые'
                    },
                    {
                        name: '❌ Выйти из просмотра',
                        value: 'exit',
                        short: 'Выход'
                    }
                );

                const { selectedCategory } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectedCategory',
                        message: 'Выберите категорию для просмотра деталей:',
                        choices: choices,
                        pageSize: 20 // Показываем 20 элементов на странице
                    }
                ]);

                if (selectedCategory === 'save_empty') {
                    await this.saveEmptyCategories(categoryStats);
                } else if (selectedCategory !== 'exit') {
                    const selectedStat = categoryStats[selectedCategory];
                    console.log('');
                    console.log(chalk.blue(`📋 Детали категории: ${selectedStat.name}`));
                    console.log(chalk.cyan(`   📄 Файл: ${selectedStat.file}`));
                    console.log(chalk.green(`   📦 Количество товаров: ${selectedStat.count}`));
                    
                    if (selectedStat.count === 0) {
                        console.log(chalk.red(`   ⚠️  В этой категории нет товаров`));
            } else {
                        const color = selectedStat.count > 100 ? chalk.green : selectedStat.count > 50 ? chalk.yellow : chalk.cyan;
                        console.log(color(`   📊 Статус: ${selectedStat.count > 100 ? 'Отлично' : selectedStat.count > 50 ? 'Хорошо' : 'Нормально'}`));
                    }
                }

                console.log('');
                console.log(chalk.blue('📈 Общая статистика:'));
                console.log(chalk.cyan(`   📁 Всего категорий: ${totalCategories}`));
                console.log(chalk.green(`   📦 Всего товаров: ${totalProducts}`));
                
                // Подсчитываем категории с 0 товаров
                const emptyCategories = categoryStats.filter(stat => stat.count === 0).length;
                if (emptyCategories > 0) {
                    console.log(chalk.red(`   ⚠️  Категорий с 0 товаров: ${emptyCategories}`));
                }
                
                if (totalCategories > 0) {
                    const avgProducts = Math.round(totalProducts / totalCategories);
                    console.log(chalk.yellow(`   📊 Среднее количество товаров на категорию: ${avgProducts}`));
                }
            }

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка при анализе файлов: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Сохранение пустых категорий в файл
    async saveEmptyCategories(categoryStats) {
        const emptyCategories = categoryStats.filter(stat => stat.count === 0);
        
        if (emptyCategories.length === 0) {
            console.log(chalk.green('✅ Нет пустых категорий для сохранения'));
            return;
        }

        const { fileName, includeUrls } = await inquirer.prompt([
            {
                type: 'input',
                name: 'fileName',
                message: 'Введите имя файла для сохранения:',
                default: `empty_categories_${new Date().toISOString().slice(0, 10)}.txt`,
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Имя файла не может быть пустым';
                    }
                    return true;
                }
            },
            {
                type: 'confirm',
                name: 'includeUrls',
                message: 'Включить ссылки на категории?',
                default: true
            }
        ]);

        try {
            const fs = require('fs').promises;
            
            // Получаем ссылки на категории, если нужно
            let categoryUrls = {};
            if (includeUrls) {
                console.log(chalk.blue('🔍 Поиск ссылок на категории...'));
                categoryUrls = await this.getCategoryUrls(emptyCategories);
            }

            const content = [
                `# Список пустых категорий (${emptyCategories.length} шт.)`,
                `# Дата создания: ${new Date().toLocaleString('ru-RU')}`,
                `# Всего категорий в анализе: ${categoryStats.length}`,
                includeUrls ? `# Включены ссылки на категории` : `# Без ссылок`,
                '',
                ...emptyCategories.map(stat => {
                    const url = categoryUrls[stat.name];
                    if (includeUrls && url) {
                        return `${stat.name} (файл: ${stat.file})\n${url}`;
                    } else {
                        return `${stat.name} (файл: ${stat.file})`;
                    }
                })
            ].join('\n');

            const filePath = `tctgr/${fileName}`;
            await fs.writeFile(filePath, content, 'utf8');
            
            console.log(chalk.green(`✅ Список пустых категорий сохранен в файл: ${filePath}`));
            console.log(chalk.cyan(`📊 Сохранено ${emptyCategories.length} категорий`));
            
            if (includeUrls) {
                const foundUrls = Object.keys(categoryUrls).length;
                console.log(chalk.cyan(`🔗 Найдено ссылок: ${foundUrls} из ${emptyCategories.length}`));
            }
            
            // Показываем первые несколько категорий
            console.log(chalk.yellow('📋 Первые 5 пустых категорий:'));
            emptyCategories.slice(0, 5).forEach((stat, index) => {
                const url = categoryUrls[stat.name];
                if (includeUrls && url) {
                    console.log(chalk.cyan(`   ${index + 1}. ${stat.name}`));
                    console.log(chalk.blue(`      🔗 ${url}`));
                } else {
                    console.log(chalk.cyan(`   ${index + 1}. ${stat.name}`));
                }
            });
            
            if (emptyCategories.length > 5) {
                console.log(chalk.cyan(`   ... и еще ${emptyCategories.length - 5} категорий`));
            }

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка при сохранении файла: ${error.message}`));
        }
    }

    // Получение ссылок на категории
    async getCategoryUrls(emptyCategories) {
        const fs = require('fs').promises;
        const categoryUrls = {};

        try {
            // Читаем файл с категориями
            const content = await fs.readFile(this.selectedCategoriesFile, 'utf8');
            const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

            // Создаем расширенный маппинг с информацией о группе и категории
            const categoryMap = {};
            const categoryDetails = {};
            
            lines.forEach(line => {
                if (line.includes('hotline.ua')) {
                    const categoryName = this.parser.extractPathFromUrl(line);
                    categoryMap[categoryName] = line;
                    
                    // Извлекаем группу и категорию из URL
                    const urlParts = this.extractGroupAndCategory(line);
                    categoryDetails[categoryName] = {
                        url: line,
                        group: urlParts.group,
                        category: urlParts.category,
                        fullPath: urlParts.fullPath
                    };
                }
            });

            // Показываем отладочную информацию о доступных категориях
            console.log(chalk.blue(`🔍 Поиск ссылок для ${emptyCategories.length} пустых категорий`));
            console.log(chalk.cyan(`📋 Доступные категории в файле: ${Object.keys(categoryMap).length}`));
            
            // Показываем примеры доступных категорий с деталями
            console.log(chalk.yellow('📋 Примеры доступных категорий в файле:'));
            Object.keys(categoryDetails).slice(0, 5).forEach(category => {
                const details = categoryDetails[category];
                console.log(chalk.cyan(`   - ${category} (группа: ${details.group}, категория: ${details.category})`));
            });
            
            // Показываем примеры пустых категорий
            console.log(chalk.yellow('📋 Примеры пустых категорий из JSON:'));
            emptyCategories.slice(0, 5).forEach(stat => {
                console.log(chalk.red(`   - ${stat.name}`));
            });

            // Находим URL для пустых категорий с улучшенным алгоритмом
            emptyCategories.forEach(stat => {
                // Пробуем найти точное совпадение
                if (categoryMap[stat.name]) {
                    categoryUrls[stat.name] = categoryMap[stat.name];
                } else {
                    // Пробуем найти по улучшенному сопоставлению
                    const statNameLower = stat.name.toLowerCase();
                    let bestMatch = null;
                    let bestScore = 0;
                    
                    for (const [categoryName, details] of Object.entries(categoryDetails)) {
                        const categoryNameLower = categoryName.toLowerCase();
                        const categoryLower = details.category.toLowerCase();
                        const groupLower = details.group.toLowerCase();
                        
                        // Вычисляем оценку совпадения
                        let score = 0;
                        
                        // Точное совпадение категории
                        if (statNameLower === categoryLower) score += 100;
                        if (statNameLower === categoryNameLower) score += 100;
                        
                        // Частичное совпадение категории
                        if (statNameLower.includes(categoryLower) || categoryLower.includes(statNameLower)) score += 50;
                        if (statNameLower.includes(categoryNameLower) || categoryNameLower.includes(statNameLower)) score += 50;
                        
                        // Совпадение по группе
                        if (statNameLower.includes(groupLower) || groupLower.includes(statNameLower)) score += 30;
                        
                        // Нормализованное совпадение
                        if (this.normalizeCategoryName(statNameLower) === this.normalizeCategoryName(categoryLower)) score += 80;
                        if (this.normalizeCategoryName(statNameLower) === this.normalizeCategoryName(categoryNameLower)) score += 80;
                        
                        // Обновляем лучшее совпадение
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = details.url;
                        }
                    }
                    
                    // Если нашли хорошее совпадение (оценка > 30)
                    if (bestMatch && bestScore > 30) {
                        categoryUrls[stat.name] = bestMatch;
                        console.log(chalk.green(`🎯 Найдено совпадение для "${stat.name}" (оценка: ${bestScore})`));
                    }
                }
            });

            // Показываем результаты
            const foundCount = Object.keys(categoryUrls).length;
            console.log(chalk.green(`✅ Найдено совпадений: ${foundCount}`));
            
            if (foundCount > 0) {
                console.log(chalk.yellow('📋 Примеры найденных ссылок:'));
                Object.entries(categoryUrls).slice(0, 3).forEach(([name, url]) => {
                    console.log(chalk.cyan(`   ${name} → ${url}`));
                });
            }
            
            // Показываем категории, для которых не найдены ссылки
            const notFound = emptyCategories.filter(stat => !categoryUrls[stat.name]);
            if (notFound.length > 0) {
                console.log(chalk.red(`❌ Не найдены ссылки для ${notFound.length} категорий:`));
                notFound.slice(0, 5).forEach(stat => {
                    console.log(chalk.red(`   - ${stat.name}`));
                });
                if (notFound.length > 5) {
                    console.log(chalk.red(`   ... и еще ${notFound.length - 5} категорий`));
                }
                
                // Предлагаем ручное сопоставление
                const { manualMapping } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'manualMapping',
                        message: 'Попробовать ручное сопоставление для оставшихся категорий?',
                        default: false
                    }
                ]);
                
                if (manualMapping) {
                    await this.manualCategoryMapping(notFound, categoryMap, categoryUrls);
                }
            }

        } catch (error) {
            console.log(chalk.yellow(`⚠️  Не удалось найти ссылки: ${error.message}`));
        }

        return categoryUrls;
    }

    // Извлечение группы и категории из URL
    extractGroupAndCategory(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
            
            // Убираем 'ua' если оно есть в начале
            const cleanParts = pathParts[0] === 'ua' ? pathParts.slice(1) : pathParts;
            
            if (cleanParts.length >= 2) {
                return {
                    group: cleanParts[0],           // mobile, computer, etc.
                    category: cleanParts[1],        // aksessuary-dlya-zaryadki, etc.
                    fullPath: cleanParts.join('/')  // mobile/aksessuary-dlya-zaryadki
                };
            } else if (cleanParts.length === 1) {
                return {
                    group: cleanParts[0],
                    category: cleanParts[0],
                    fullPath: cleanParts[0]
                };
            } else {
                return {
                    group: 'unknown',
                    category: 'unknown',
                    fullPath: 'unknown'
                };
            }
        } catch (error) {
            return {
                group: 'error',
                category: 'error',
                fullPath: 'error'
            };
        }
    }

    // Нормализация названий категорий для лучшего сопоставления
    normalizeCategoryName(name) {
        return name
            .replace(/[^a-zа-я0-9]/g, '') // Убираем все символы кроме букв и цифр
            .replace(/телефон/g, 'телефоны')
            .replace(/смартфон/g, 'смартфоны')
            .replace(/ноутбук/g, 'ноутбуки')
            .replace(/компьютер/g, 'компьютеры')
            .replace(/планшет/g, 'планшеты')
            .replace(/монитор/g, 'мониторы');
    }

    // Парсинг выбранного файла
    async parseSelectedFile() {
        this.showHeader();
        console.log(chalk.blue('📦 Парсинг выбранного файла'));
        console.log(chalk.cyan(`📁 Используется файл: ${this.selectedCategoriesFile}`));
        console.log('');

        try {
            // Проверяем наличие файла категорий
            const fs = require('fs').promises;
            let categories;
            
            try {
                const content = await fs.readFile(this.selectedCategoriesFile, 'utf8');
                categories = content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'))
                    .filter(line => line.includes('hotline.ua'));
            } catch (error) {
                console.log(chalk.red(`❌ Файл ${this.selectedCategoriesFile} не найден!`));
                await this.waitForEnter();
                return;
            }

            if (categories.length === 0) {
                console.log(chalk.red('❌ В файле нет валидных URL!'));
                await this.waitForEnter();
                return;
            }

            console.log(chalk.green(`✅ Найдено ${categories.length} категорий:`));
            categories.forEach((url, index) => {
                const categoryName = this.parser.extractPathFromUrl(url);
                console.log(chalk.cyan(`   ${index + 1}. ${categoryName}`));
            });

            console.log('');
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Начать парсинг всех категорий?',
                    default: true
                }
            ]);

            if (!confirm) {
                return;
            }

            // Показываем прогресс
            const spinner = ora('🚀 Запуск парсера...').start();
            
            const results = await this.parser.parseAllCategories(
                categories, 
                this.config.saveProgressively, 
                this.config.batchSize, 
                this.config.autoGetTokens
            );

            spinner.succeed('✅ Парсинг завершен!');

            // Показываем результаты
            this.showParseResults(results);

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Парсинг нескольких файлов
    async parseMultipleFiles(filePaths) {
        this.showHeader();
        console.log(chalk.blue('📦 Парсинг нескольких файлов'));
        console.log(chalk.cyan(`📁 Выбрано файлов: ${filePaths.length}`));
        console.log('');

        try {
            const fs = require('fs').promises;
            let allCategories = [];
            const fileStats = [];

            // Читаем все файлы и собираем категории
            console.log(chalk.blue('📖 Чтение файлов...'));
            
            for (const filePath of filePaths) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const categories = content
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0 && !line.startsWith('#'))
                        .filter(line => line.includes('hotline.ua'));

                    fileStats.push({
                        file: filePath,
                        count: categories.length,
                        categories: categories
                    });

                    allCategories.push(...categories);
                    console.log(chalk.cyan(`   📄 ${filePath}: ${categories.length} категорий`));

                } catch (error) {
                    console.log(chalk.red(`   ❌ ${filePath}: ошибка чтения - ${error.message}`));
                }
            }

            // Убираем дубликаты URL
            const uniqueCategories = [...new Set(allCategories)];

            if (uniqueCategories.length === 0) {
                console.log(chalk.red('❌ Нет валидных URL во всех файлах!'));
                await this.waitForEnter();
                return;
            }

            console.log('');
            console.log(chalk.green(`✅ Всего уникальных категорий: ${uniqueCategories.length}`));
            
            if (uniqueCategories.length !== allCategories.length) {
                console.log(chalk.yellow(`⚠️  Удалено ${allCategories.length - uniqueCategories.length} дубликатов`));
            }

            // Показываем статистику по файлам
            console.log('');
            console.log(chalk.blue('📊 Статистика по файлам:'));
            fileStats.forEach((stat, index) => {
                const color = stat.count > 50 ? chalk.green : stat.count > 20 ? chalk.yellow : chalk.cyan;
                console.log(color(`   ${index + 1}. ${stat.file}: ${stat.count} категорий`));
            });

            console.log('');
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Начать парсинг ${uniqueCategories.length} уникальных категорий?`,
                    default: true
                }
            ]);

            if (!confirm) {
                return;
            }

            // Показываем прогресс
            const spinner = ora('🚀 Запуск парсера для нескольких файлов...').start();
            
            const results = await this.parser.parseAllCategories(
                uniqueCategories, 
                this.config.saveProgressively, 
                this.config.batchSize, 
                this.config.autoGetTokens
            );

            spinner.succeed('✅ Парсинг завершен!');

            // Показываем результаты
            this.showParseResults(results);

            // Дополнительная статистика по файлам
            console.log('');
            console.log(chalk.blue('📊 Результаты по файлам:'));
            
            let totalSuccess = 0;
            let totalErrors = 0;
            
            for (const stat of fileStats) {
                let fileSuccess = 0;
                let fileErrors = 0;
                
                for (const category of stat.categories) {
                    const categoryName = this.parser.extractPathFromUrl(category);
                    if (results[categoryName] && !results[categoryName].error) {
                        fileSuccess++;
                    } else {
                        fileErrors++;
                    }
                }
                
                const color = fileErrors === 0 ? chalk.green : fileErrors > fileSuccess ? chalk.red : chalk.yellow;
                console.log(color(`   📄 ${stat.file}: ${fileSuccess} успешно, ${fileErrors} ошибок`));
                
                totalSuccess += fileSuccess;
                totalErrors += fileErrors;
            }

            console.log('');
            console.log(chalk.blue('📈 Итоговая статистика по файлам:'));
            console.log(chalk.green(`   Успешно обработано: ${totalSuccess} категорий`));
            console.log(chalk.red(`   Ошибок: ${totalErrors} категорий`));

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Ручное сопоставление категорий
    async manualCategoryMapping(notFound, categoryMap, categoryUrls) {
        console.log(chalk.blue('🔧 Ручное сопоставление категорий'));
        console.log(chalk.yellow('Для каждой категории выберите соответствующую ссылку или пропустите'));
        
        // Создаем детальную информацию о доступных категориях
        const availableCategories = Object.keys(categoryMap).map(cat => {
            const urlParts = this.extractGroupAndCategory(categoryMap[cat]);
            return {
                name: `${cat} (${urlParts.group}/${urlParts.category})`,
                value: cat,
                group: urlParts.group,
                category: urlParts.category
            };
        });
        
        for (let i = 0; i < Math.min(notFound.length, 10); i++) { // Ограничиваем до 10 для удобства
            const stat = notFound[i];
            
            console.log(chalk.cyan(`\n📋 Категория ${i + 1}/${Math.min(notFound.length, 10)}: ${stat.name}`));
            
            const choices = [
                ...availableCategories,
                { name: '⏭️  Пропустить эту категорию', value: 'skip' },
                { name: '❌ Завершить сопоставление', value: 'stop' }
            ];
            
            const { selectedCategory } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedCategory',
                    message: 'Выберите соответствующую категорию:',
                    choices: choices,
                    pageSize: 20
                }
            ]);
            
            if (selectedCategory === 'stop') {
                break;
            } else if (selectedCategory === 'skip') {
                continue;
            } else {
                categoryUrls[stat.name] = categoryMap[selectedCategory];
                const selectedDetails = availableCategories.find(cat => cat.value === selectedCategory);
                console.log(chalk.green(`✅ Сопоставлено: ${stat.name} → ${selectedCategory} (${selectedDetails.group}/${selectedDetails.category})`));
            }
        }
        
        console.log(chalk.green(`\n✅ Ручное сопоставление завершено`));
    }

    // Рекурсивное получение всех файлов в директории и подпапках
    async getAllFilesInDirectory(dir, baseDir = '') {
        const fs = require('fs').promises;
        const path = require('path');
        const allFiles = [];

        try {
            const items = await fs.readdir(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = path.join(baseDir, item);
                const stat = await fs.stat(fullPath);
                
                if (stat.isDirectory()) {
                    // Рекурсивно ищем в подпапке
                    const subFiles = await this.getAllFilesInDirectory(fullPath, relativePath);
                    allFiles.push(...subFiles);
                } else if (stat.isFile()) {
                    // Добавляем файл с относительным путем
                    allFiles.push(relativePath);
                }
            }
        } catch (error) {
            // Игнорируем ошибки доступа к папкам
        }

        return allFiles;
    }

    // Группировка файлов по папкам
    groupFilesByFolder(files) {
        const grouped = { root: [] };
        
        files.forEach(file => {
            const pathParts = file.split(/[\/\\]/);
            
            if (pathParts.length === 1) {
                // Файл в корневой папке
                grouped.root.push(file);
            } else {
                // Файл в подпапке
                const folder = pathParts[0];
                const fileName = pathParts[pathParts.length - 1];
                
                if (!grouped[folder]) {
                    grouped[folder] = [];
                }
                grouped[folder].push(fileName);
            }
        });
        
        return grouped;
    }

    // Получение файлов в директории (для обратной совместимости)
    async getFilesInDirectory(dir) {
        try {
            const fs = require('fs').promises;
            const files = await fs.readdir(dir);
            return files.filter(file => file.endsWith('.json') || file.endsWith('.csv'));
        } catch (error) {
            return [];
        }
    }

    // Показ результатов парсинга
    showParseResults(results) {
        console.log('');
        console.log(chalk.green('📊 Результаты парсинга:'));
        console.log('');

        let totalProducts = 0;
        let successCount = 0;
        let errorCount = 0;

        Object.keys(results).forEach(categoryName => {
            const result = results[categoryName];
            if (result.error) {
                console.log(chalk.red(`❌ ${categoryName}: ${result.error}`));
                errorCount++;
            } else {
                console.log(chalk.green(`✅ ${categoryName}: ${result.count} товаров`));
                totalProducts += result.count;
                successCount++;
            }
        });

        console.log('');
        console.log(chalk.blue('📈 Итоговая статистика:'));
        console.log(chalk.cyan(`   Успешных категорий: ${successCount}`));
        console.log(chalk.red(`   Ошибок: ${errorCount}`));
        console.log(chalk.green(`   Всего товаров: ${totalProducts}`));
    }

    // Показ статистики товаров
    showProductStats(products) {
        console.log('');
        console.log(chalk.blue('📊 Статистика товаров:'));
        console.log(chalk.cyan(`   Всего товаров: ${products.length}`));
        
        if (products.length > 0) {
            const prices = products.filter(p => p.minPrice).map(p => p.minPrice);
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
                
                console.log(chalk.cyan(`   Минимальная цена: ${minPrice} грн`));
                console.log(chalk.cyan(`   Максимальная цена: ${maxPrice} грн`));
                console.log(chalk.cyan(`   Средняя цена: ${avgPrice} грн`));
            }
        }
    }

    // Показ результатов производительности
    showPerformanceResults(results) {
        console.log('');
        console.log(chalk.green('📊 Результаты тестирования производительности:'));
        console.log('');

        results.results.forEach(result => {
            const color = result.speed > 10 ? chalk.green : result.speed > 5 ? chalk.yellow : chalk.red;
            console.log(color(`   Батч ${result.batchSize}: ${result.duration.toFixed(2)}с, ${result.productsCount} товаров, ${result.speed.toFixed(1)} товаров/с`));
        });

        console.log('');
        console.log(chalk.blue(`🏆 Оптимальный размер батча: ${results.optimal.batchSize} (${results.optimal.speed.toFixed(1)} товаров/с)`));
    }

    // Ожидание нажатия Enter
    async waitForEnter() {
        // Добавляем отступ перед сообщением
        console.log('\n');
        
        await inquirer.prompt([
            {
                type: 'input',
                name: 'enter',
                message: 'Нажмите Enter для продолжения...'
            }
        ]);
        
        // Добавляем отступ после нажатия Enter
        console.log('\n');
    }

    // Выход
    exit() {
        console.log(chalk.cyan('👋 До свидания!'));
        process.exit(0);
    }

    // Запуск CLI
    async run() {
        while (true) {
            this.showHeader();
            await this.showMainMenu();
        }
    }
}

// Запускаем CLI
if (require.main === module) {
    const cli = new HotlineCLI();
    cli.run().catch(console.error);
}

module.exports = HotlineCLI; 