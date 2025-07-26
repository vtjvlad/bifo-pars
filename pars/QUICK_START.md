# Быстрый старт - Парсер фильтров Hotline.ua

## Установка и запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Быстрый тест
```bash
npm test
```

### 3. Запуск парсера одной категории
```bash
npm start
```

### 4. Запуск примеров
```bash
npm run example
```

## Быстрые команды

### Парсинг одной категории (телефоны)
```bash
node hotline-filters-parser.js
```

### Тестирование функциональности
```bash
node test-filters-parser.js
```

### Парсинг всех категорий из файла
```bash
# Сначала создайте файл categories.txt на основе categories-example.txt
node hotline-filters-parser.js
```

## Структура файлов

```
pars/
├── hotline-filters-parser.js    # Основной парсер
├── test-filters-parser.js       # Тестовый скрипт
├── example-filters-usage.js     # Примеры использования
├── categories-example.txt       # Пример файла категорий
├── package.json                 # Зависимости
├── README-filters-parser.md     # Полная документация
└── QUICK_START.md              # Этот файл
```

## Минимальный пример использования

```javascript
const HotlineFiltersParser = require('./hotline-filters-parser');

async function quickTest() {
    const parser = new HotlineFiltersParser();
    
    // Получаем фильтры для телефонов
    const filters = await parser.getCategoryFilters(
        386, // sectionId для телефонов
        'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/'
    );
    
    console.log(`Получено ${filters.length} фильтров`);
    
    // Сохраняем в JSON
    await parser.saveToFile(filters, 'JSON/phone-filters.json');
}

quickTest();
```

## Настройки в коде

Откройте `hotline-filters-parser.js` и измените настройки в функции `main()`:

```javascript
const PARSE_ALL_CATEGORIES = false; // true для всех категорий, false для одной
const SINGLE_CATEGORY_URL = 'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/';
const SINGLE_SECTION_ID = 386;
const AUTO_GET_TOKENS = true;
```

## Выходные файлы

После запуска создаются папки:
- `JSON/` - файлы с фильтрами в JSON формате
- `CSV/` - файлы с фильтрами в CSV формате

## Устранение проблем

### Ошибка с токенами
Парсер автоматически получает токены через Puppeteer. Если возникают проблемы, проверьте:
- Доступ к интернету
- Установку Puppeteer: `npm install puppeteer`

### Ошибки запросов
Парсер включает автоматические повторные попытки и адаптивные задержки. При частых ошибках:
- Увеличьте задержки в коде
- Проверьте доступность сайта
- Используйте VPN при необходимости

### Проблемы с зависимостями
```bash
# Переустановка зависимостей
rm -rf node_modules package-lock.json
npm install
```

## Поддержка

При возникновении проблем:
1. Проверьте логи в консоли
2. Убедитесь в корректности URL категорий
3. Проверьте доступность сайта Hotline.ua
4. Обратитесь к полной документации в `README-filters-parser.md` 