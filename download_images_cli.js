#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

// Проверяем версию chalk и настраиваем соответственно
if (chalk.level > 0) {
    // chalk v4+ (CommonJS)
    chalk.level = 3; // Включаем все цвета
} else {
    // chalk v5+ (ESM) - используем fallback
    console.log('⚠️  Рекомендуется установить chalk v4: npm install chalk@4.1.2');
}

class ImageDownloaderCLI {
    constructor() {
        this.config = {
            outputDir: '/home/vtjvlad/server/bifo/public',
            timeout: 30000,
            delay: 100,
            maxRetries: 3,
            concurrent: 1,
            linksFile: 'image_links.txt'
        };
    }

    // Показываем красивый заголовок
    showHeader() {
        console.clear();
        
        // Добавляем отступы для увеличения области взаимодействия
        console.log('\n'.repeat(2));
        
        console.log(
            chalk.cyan(
                figlet.textSync('Image Downloader', { 
                    horizontalLayout: 'full',
                    font: 'Standard'
                })
            )
        );
        
        console.log(
            boxen(
                chalk.yellow('🚀 Мультифункциональный загрузчик изображений с CLI интерфейсом'),
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
                    { name: '📥 Загрузить изображения из файла', value: 'download_from_file' },
                    { name: '📁 Выбрать файл со ссылками', value: 'select_file' },
                    { name: '🔗 Загрузить изображения по URL', value: 'download_single_url' },
                    { name: '⚙️  Настройки', value: 'settings' },
                    { name: '📊 Статистика загрузок', value: 'statistics' },
                    { name: '🧪 Тестирование соединения', value: 'test_connection' },
                    { name: '❌ Выход', value: 'exit' }
                ],
                pageSize: 15,
                loop: true,
                highlight: true,
                transformer: (input, { isFinal }) => {
                    // Делаем выбранный элемент более заметным
                    if (isFinal) {
                        return chalk.bold.cyan(`▶ ${input} ◀`);
                    }
                    return chalk.bold.cyan(`▶ ${input} ◀`);
                }
            }
        ]);

        switch (action) {
            case 'download_from_file':
                await this.downloadFromFile();
                break;
            case 'select_file':
                await this.selectLinksFile();
                break;
            case 'download_single_url':
                await this.downloadSingleUrl();
                break;
            case 'settings':
                await this.showSettings();
                break;
            case 'statistics':
                await this.showStatistics();
                break;
            case 'test_connection':
                await this.testConnection();
                break;
            case 'exit':
                this.exit();
                break;
        }
    }

    // Выбор файла со ссылками
    async selectLinksFile() {
        this.showHeader();
        console.log(chalk.blue('📁 Выбор файла со ссылками на изображения'));
        console.log('\n');

        const fs = require('fs').promises;

        try {
            // Получаем список файлов в текущей директории
            const fsPromises = require('fs').promises;
            const files = await fsPromises.readdir('.');
            const linkFiles = files.filter(file => 
                file.endsWith('.txt') || 
                file.endsWith('.csv') || 
                file.endsWith('.json') ||
                file.includes('links') ||
                file.includes('images')
            );

            if (linkFiles.length === 0) {
                console.log(chalk.yellow('📁 Нет доступных файлов со ссылками'));
                console.log(chalk.cyan('Создайте файл с ссылками на изображения'));
                await this.waitForEnter();
                return;
            }

            // Создаем список выбора
            const choices = linkFiles.map(file => ({
                name: `📄 ${file}`,
                value: file
            }));

            choices.push(
                { name: '📝 Ввести путь к файлу вручную', value: 'manual' },
                { name: '🔙 Назад', value: 'back' }
            );

            const { selectedFile } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedFile',
                    message: 'Выберите файл со ссылками:',
                    choices: choices,
                    pageSize: 20,
                    loop: true,
                    highlight: true,
                    transformer: (input, { isFinal }) => {
                        if (isFinal) {
                            return chalk.bold.green(`▶ ${input} ◀`);
                        }
                        return chalk.bold.green(`▶ ${input} ◀`);
                    }
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
                        default: this.config.linksFile || 'image_links.txt',
                        validate: (input) => {
                            if (!input.trim()) {
                                return 'Путь не может быть пустым';
                            }
                            return true;
                        }
                    }
                ]);
                filePath = manualPath.trim();
            } else {
                filePath = selectedFile;
            }

            // Проверяем существование файла
            try {
                const fsPromises = require('fs').promises;
                await fsPromises.access(filePath);
                this.config.linksFile = filePath;
                console.log(chalk.green(`✅ Выбран файл: ${filePath}`));
                
                // Показываем содержимое файла
                const content = await fsPromises.readFile(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim().length > 0);
                
                console.log(chalk.cyan(`📊 Статистика файла:`));
                console.log(chalk.cyan(`   Всего строк: ${lines.length}`));
                console.log(chalk.cyan(`   Валидных URL: ${lines.filter(line => line.includes('http')).length}`));
                
                if (lines.length === 0) {
                    console.log(chalk.yellow('⚠️  В файле нет ссылок'));
                } else {
                    // Предлагаем варианты действий
                    const { action } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'action',
                            message: 'Выберите действие:',
                            choices: [
                                { name: '📥 Загрузить все изображения', value: 'download_all' },
                                { name: '🔙 Назад', value: 'back' }
                            ],
                            pageSize: 10,
                            loop: true,
                            highlight: true,
                            transformer: (input, { isFinal }) => {
                                if (isFinal) {
                                    return chalk.bold.blue(`▶ ${input} ◀`);
                                }
                                return chalk.bold.blue(`▶ ${input} ◀`);
                            }
                        }
                    ]);

                    if (action === 'back') {
                        return;
                    } else if (action === 'download_all') {
                        console.log('');
                        await this.startDownload(filePath);
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

    // Загрузка из файла
    async downloadFromFile() {
        this.showHeader();
        console.log(chalk.blue('📥 Загрузка изображений из файла'));
        console.log('\n');

        if (!this.config.linksFile) {
            console.log(chalk.yellow('⚠️  Файл со ссылками не выбран'));
            console.log(chalk.cyan('Сначала выберите файл со ссылками'));
            await this.waitForEnter();
            return;
        }

        try {
            const fsPromises = require('fs').promises;
            await fsPromises.access(this.config.linksFile);
            await this.startDownload(this.config.linksFile);
        } catch (error) {
            console.log(chalk.red(`❌ Файл ${this.config.linksFile} не найден!`));
            console.log(chalk.yellow('Используйте "Выбрать файл со ссылками" для выбора другого файла'));
            await this.waitForEnter();
        }
    }

    // Загрузка одного URL
    async downloadSingleUrl() {
        this.showHeader();
        console.log(chalk.blue('🔗 Загрузка изображения по URL'));
        console.log('\n');

        const { imageUrl } = await inquirer.prompt([
            {
                type: 'input',
                name: 'imageUrl',
                message: 'Введите URL изображения:',
                default: 'https://example.com/image.jpg',
                validate: (input) => {
                    if (!input.includes('http')) {
                        return 'URL должен начинаться с http:// или https://';
                    }
                    return true;
                }
            }
        ]);

        try {
            const spinner = ora('📥 Загружаю изображение...').start();
            
            const result = await this.downloadSingleImage(imageUrl, this.config.outputDir, this.config, 0, 1);
            
            if (result.success) {
                spinner.succeed(`✅ Изображение загружено: ${result.filePath}`);
            } else {
                spinner.fail(`❌ Ошибка загрузки: ${result.error}`);
            }

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Настройки
    async showSettings() {
        this.showHeader();
        console.log(chalk.blue('⚙️  Настройки загрузчика'));
        console.log('\n');

        const { setting } = await inquirer.prompt([
            {
                type: 'list',
                name: 'setting',
                message: 'Выберите настройку для изменения:',
                choices: [
                    { name: `📁 Папка для сохранения: ${this.config.outputDir}`, value: 'output_dir' },
                    { name: `⏱️  Таймаут: ${this.config.timeout / 1000}с`, value: 'timeout' },
                    { name: `⏳ Задержка между запросами: ${this.config.delay}мс`, value: 'delay' },
                    { name: `🔄 Повторные попытки: ${this.config.maxRetries}`, value: 'retries' },
                    { name: `⚡ Одновременные загрузки: ${this.config.concurrent}`, value: 'concurrent' },
                    { name: '🔙 Назад', value: 'back' }
                ],
                pageSize: 15,
                loop: true,
                highlight: true,
                transformer: (input, { isFinal }) => {
                    if (isFinal) {
                        return chalk.bold.magenta(`▶ ${input} ◀`);
                    }
                    return chalk.bold.magenta(`▶ ${input} ◀`);
                }
            }
        ]);

        switch (setting) {
            case 'output_dir':
                await this.changeOutputDir();
                break;
            case 'timeout':
                await this.changeTimeout();
                break;
            case 'delay':
                await this.changeDelay();
                break;
            case 'retries':
                await this.changeRetries();
                break;
            case 'concurrent':
                await this.changeConcurrent();
                break;
            case 'back':
                return;
        }

        await this.showSettings();
    }

    // Изменение папки для сохранения
    async changeOutputDir() {
        const { outputDir } = await inquirer.prompt([
            {
                type: 'input',
                name: 'outputDir',
                message: 'Введите папку для сохранения изображений:',
                default: this.config.outputDir,
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Путь не может быть пустым';
                    }
                    return true;
                }
            }
        ]);

        this.config.outputDir = outputDir.trim();
        console.log(chalk.green(`✅ Папка для сохранения изменена на: ${outputDir}`));
    }

    // Изменение таймаута
    async changeTimeout() {
        const { timeout } = await inquirer.prompt([
            {
                type: 'number',
                name: 'timeout',
                message: 'Введите таймаут в секундах (10-300):',
                default: this.config.timeout / 1000,
                validate: (input) => {
                    if (input < 10 || input > 300) {
                        return 'Таймаут должен быть от 10 до 300 секунд';
                    }
                    return true;
                }
            }
        ]);

        this.config.timeout = timeout * 1000;
        console.log(chalk.green(`✅ Таймаут изменен на ${timeout} секунд`));
    }

    // Изменение задержки
    async changeDelay() {
        const { delay } = await inquirer.prompt([
            {
                type: 'number',
                name: 'delay',
                message: 'Введите задержку между запросами в миллисекундах (0-5000):',
                default: this.config.delay,
                validate: (input) => {
                    if (input < 0 || input > 5000) {
                        return 'Задержка должна быть от 0 до 5000 миллисекунд';
                    }
                    return true;
                }
            }
        ]);

        this.config.delay = delay;
        console.log(chalk.green(`✅ Задержка изменена на ${delay}мс`));
    }

    // Изменение повторных попыток
    async changeRetries() {
        const { maxRetries } = await inquirer.prompt([
            {
                type: 'number',
                name: 'maxRetries',
                message: 'Введите количество повторных попыток (1-10):',
                default: this.config.maxRetries,
                validate: (input) => {
                    if (input < 1 || input > 10) {
                        return 'Количество попыток должно быть от 1 до 10';
                    }
                    return true;
                }
            }
        ]);

        this.config.maxRetries = maxRetries;
        console.log(chalk.green(`✅ Количество повторных попыток изменено на ${maxRetries}`));
    }

    // Изменение одновременных загрузок
    async changeConcurrent() {
        const { concurrent } = await inquirer.prompt([
            {
                type: 'number',
                name: 'concurrent',
                message: 'Введите количество одновременных загрузок (1-10):',
                default: this.config.concurrent,
                validate: (input) => {
                    if (input < 1 || input > 10) {
                        return 'Количество одновременных загрузок должно быть от 1 до 10';
                    }
                    return true;
                }
            }
        ]);

        this.config.concurrent = concurrent;
        console.log(chalk.green(`✅ Количество одновременных загрузок изменено на ${concurrent}`));
    }

    // Показ статистики
    async showStatistics() {
        this.showHeader();
        console.log(chalk.blue('📊 Статистика загрузок'));
        console.log('\n');

        try {
            const fsPromises = require('fs').promises;
            
            // Получаем общее количество ссылок в файле по умолчанию
            let totalLinks = 0;
            let fileExists = false;
            
            try {
                if (this.config.linksFile) {
                    await fsPromises.access(this.config.linksFile);
                    const content = await fsPromises.readFile(this.config.linksFile, 'utf8');
                    const links = content.split('\n').filter(line => line.trim().length > 0);
                    totalLinks = links.length;
                    fileExists = true;
                }
            } catch (error) {
                // Игнорируем ошибки чтения файла
            }

            console.log(chalk.blue('📋 Файл со ссылками:'));
            if (fileExists) {
                console.log(chalk.green(`   ✅ ${this.config.linksFile}: ${totalLinks} ссылок`));
            } else {
                console.log(chalk.yellow(`   ⚠️  ${this.config.linksFile}: файл не найден`));
            }
            
            // Проверяем папку с загруженными изображениями
            try {
                await fsPromises.access(this.config.outputDir);
            } catch (error) {
                console.log(chalk.yellow('📁 Папка с загруженными изображениями не найдена'));
                console.log(chalk.cyan('Сначала загрузите изображения'));
                await this.waitForEnter();
                return;
            }
            
            try {
                // Проверяем только папку img/tx внутри outputDir
                const imgTxPath = path.join(this.config.outputDir, 'img', 'tx');
                
                let imageFiles = [];
                try {
                    await fsPromises.access(imgTxPath);
                    const files = await fsPromises.readdir(imgTxPath, { recursive: true });
                    imageFiles = files.filter(file => 
                        typeof file === 'string' && 
                        (file.endsWith('.jpg') || file.endsWith('.jpeg') || 
                         file.endsWith('.png') || file.endsWith('.gif') || 
                         file.endsWith('.webp') || file.endsWith('.bmp'))
                    );
                } catch (error) {
                    // Папка img/tx не существует
                    console.log(chalk.yellow('📁 Папка img/tx не найдена'));
                    console.log(chalk.cyan('Сначала загрузите изображения'));
                    await this.waitForEnter();
                    return;
                }

                console.log('');
                console.log(chalk.green(`📁 Папка: ${imgTxPath}`));
                console.log(chalk.cyan(`📦 Загружено изображений: ${imageFiles.length}`));
                
                // Показываем прогресс в процентах
                if (totalLinks > 0 && imageFiles.length > 0) {
                    const progressPercent = Math.round((imageFiles.length / totalLinks) * 100);
                    const progressBar = this.createProgressBar(progressPercent);
                    
                    console.log('');
                    console.log(chalk.blue('📈 Прогресс загрузки:'));
                    console.log(chalk.cyan(`   ${progressBar}`));
                    console.log(chalk.cyan(`   ${imageFiles.length} из ${totalLinks} (${progressPercent}%)`));
                    
                    if (progressPercent >= 100) {
                        console.log(chalk.green('   ✅ Загрузка завершена!'));
                    } else if (progressPercent >= 75) {
                        console.log(chalk.yellow('   🔄 Почти завершено'));
                    } else if (progressPercent >= 50) {
                        console.log(chalk.yellow('   🔄 Половина пути'));
                    } else if (progressPercent >= 25) {
                        console.log(chalk.blue('   🔄 Начальный этап'));
                    } else {
                        console.log(chalk.blue('   🔄 Только начало'));
                    }
                }
                
                if (imageFiles.length > 0) {
                    // Группируем по расширениям
                    const extensions = {};
                    imageFiles.forEach(file => {
                        const ext = path.extname(file).toLowerCase();
                        extensions[ext] = (extensions[ext] || 0) + 1;
                    });

                    console.log('');
                    console.log(chalk.blue('📊 По типам файлов:'));
                    Object.entries(extensions).forEach(([ext, count]) => {
                        console.log(chalk.cyan(`   ${ext}: ${count} файлов`));
                    });

                    // Показываем размер папки
                    let totalSize = 0;
                    for (const file of imageFiles) {
                        try {
                            const filePath = path.join(imgTxPath, file);
                            const stats = await fsPromises.stat(filePath);
                            totalSize += stats.size;
                        } catch (error) {
                            // Игнорируем ошибки
                        }
                    }

                    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
                    console.log('');
                    console.log(chalk.blue('💾 Размер папки:'));
                    console.log(chalk.cyan(`   ${sizeMB} МБ`));
                }
            } catch (error) {
                console.log(chalk.red(`❌ Ошибка при анализе статистики: ${error.message}`));
            }

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка при анализе статистики: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Создание прогресс-бара
    createProgressBar(percent) {
        const barLength = 30;
        const filledLength = Math.round((percent / 100) * barLength);
        const emptyLength = barLength - filledLength;
        
        const filled = '█'.repeat(filledLength);
        const empty = '░'.repeat(emptyLength);
        
        return `${filled}${empty}`;
    }

    // Тестирование соединения
    async testConnection() {
        this.showHeader();
        console.log(chalk.blue('🧪 Тестирование соединения'));
        console.log('\n');

        const { testUrl } = await inquirer.prompt([
            {
                type: 'input',
                name: 'testUrl',
                message: 'Введите URL для тестирования:',
                default: 'https://httpbin.org/image/png',
                validate: (input) => {
                    if (!input.includes('http')) {
                        return 'URL должен начинаться с http:// или https://';
                    }
                    return true;
                }
            }
        ]);

        try {
            const spinner = ora('🧪 Тестирую соединение...').start();
            
            const result = await this.testUrlConnection(testUrl);
            
            if (result.success) {
                spinner.succeed(`✅ Соединение успешно! Размер: ${result.size} байт`);
            } else {
                spinner.fail(`❌ Ошибка соединения: ${result.error}`);
            }

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка: ${error.message}`));
        }

        await this.waitForEnter();
    }

    // Тестирование URL
    async testUrlConnection(url) {
        return new Promise((resolve) => {
            const protocol = url.startsWith('https:') ? https : http;
            
            const request = protocol.get(url, (response) => {
                if (response.statusCode === 200) {
                    let size = 0;
                    response.on('data', (chunk) => {
                        size += chunk.length;
                    });
                    response.on('end', () => {
                        resolve({ success: true, size });
                    });
                } else {
                    resolve({ success: false, error: `HTTP ${response.statusCode}` });
                }
            });

            request.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            request.setTimeout(10000, () => {
                request.destroy();
                resolve({ success: false, error: 'Timeout' });
            });
        });
    }

    // Запуск загрузки
    async startDownload(linksFilePath) {
        try {
            // Читаем файл со ссылками
            const fsPromises = require('fs').promises;
            const linksContent = await fsPromises.readFile(linksFilePath, 'utf8');
            const links = linksContent.split('\n').filter(link => link.trim() !== '');
            
            console.log(chalk.green(`✅ Найдено ${links.length} ссылок для загрузки`));
            console.log(chalk.cyan(`📁 Папка: ${this.config.outputDir}`));
            console.log(chalk.cyan(`⏱️  Таймаут: ${this.config.timeout / 1000}с`));
            console.log(chalk.cyan(`⏳ Задержка: ${this.config.delay}мс`));
            console.log(chalk.cyan(`🔄 Повторные попытки: ${this.config.maxRetries}`));
            console.log(chalk.cyan(`⚡ Одновременные загрузки: ${this.config.concurrent}`));
            console.log('');

            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Начать загрузку изображений?',
                    default: true,
                    transformer: (input, { isFinal }) => {
                        if (isFinal) {
                            return input ? chalk.bold.green('✅ ДА') : chalk.bold.red('❌ НЕТ');
                        }
                        return input ? chalk.bold.green('✅ ДА') : chalk.bold.red('❌ НЕТ');
                    }
                }
            ]);

            if (!confirm) {
                return;
            }

            // Создаем папку если её нет
            try {
                await fsPromises.access(this.config.outputDir);
            } catch (error) {
                await fsPromises.mkdir(this.config.outputDir, { recursive: true });
            }

            // Показываем прогресс
            const spinner = ora('📥 Загружаю изображения...').start();
            
            let successCount = 0;
            let errorCount = 0;
            const results = [];

            // Загружаем изображения
            if (this.config.concurrent === 1) {
                // Последовательная загрузка
                for (let i = 0; i < links.length; i++) {
                    const url = links[i].trim();
                    if (!url) continue;
                    
                    const result = await this.downloadSingleImage(url, this.config.outputDir, this.config, i, links.length);
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
                for (let i = 0; i < links.length; i += this.config.concurrent) {
                    chunks.push(links.slice(i, i + this.config.concurrent));
                }
                
                for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                    const chunk = chunks[chunkIndex];
                    const promises = chunk.map((url, index) => {
                        const globalIndex = chunkIndex * this.config.concurrent + index;
                        return this.downloadSingleImage(url.trim(), this.config.outputDir, this.config, globalIndex, links.length);
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

            spinner.succeed('✅ Загрузка завершена!');

            // Показываем результаты
            console.log('');
            console.log(chalk.green('📊 Результаты загрузки:'));
            console.log(chalk.cyan(`   Успешно загружено: ${successCount}`));
            console.log(chalk.red(`   Ошибок: ${errorCount}`));
            console.log(chalk.blue(`   Всего обработано: ${links.length}`));

        } catch (error) {
            console.log(chalk.red(`❌ Ошибка при обработке файла: ${error.message}`));
        }
    }

    // Функция для создания папок рекурсивно
    ensureDirectoryExists(filePath) {
        const dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        this.ensureDirectoryExists(dirname);
        fs.mkdirSync(dirname);
    }

    // Функция для скачивания файла с повторными попытками
    downloadFile(url, filePath, timeout, maxRetries) {
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
                    this.ensureDirectoryExists(filePath);
                    
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
    extractPathFromUrl(url) {
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
    async downloadSingleImage(url, outputDir, options, index, total) {
        try {
            // Извлекаем путь из URL
            const urlPath = this.extractPathFromUrl(url);
            
            // Создаем полный путь к файлу
            const fileName = path.basename(urlPath) || 'image.jpg';
            const relativePath = path.dirname(urlPath);
            const fullOutputPath = path.join(outputDir, relativePath, fileName);
            
            console.log(`[${index + 1}/${total}] Скачиваю: ${url}`);
            console.log(`  → ${fullOutputPath}`);
            
            await this.downloadFile(url, fullOutputPath, options.timeout, options.maxRetries);
            
            // Задержка между запросами
            if (options.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, options.delay));
            }
            
            return { success: true, url, filePath: fullOutputPath };
        } catch (error) {
            console.error(`Ошибка при скачивании ${url}: ${error.message}`);
            return { success: false, url, error: error.message };
        }
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
    const cli = new ImageDownloaderCLI();
    cli.run().catch(console.error);
}

module.exports = ImageDownloaderCLI; 