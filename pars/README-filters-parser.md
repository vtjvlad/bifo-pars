# Hotline.ua Filters Parser

Парсер для получения фильтров категорий с сайта Hotline.ua на основе GraphQL API.

## Описание

Этот парсер позволяет получать все доступные фильтры для категорий товаров на Hotline.ua, включая:
- Названия и описания фильтров
- Типы фильтров (checkbox, range, select и др.)
- Значения фильтров с количеством товаров
- Группы значений
- Популярность и другие метаданные

## Установка зависимостей

```bash
npm install axios cli-progress puppeteer
```

## Основные возможности

### 1. Получение фильтров одной категории

```javascript
const HotlineFiltersParser = require('./hotline-filters-parser');

const parser = new HotlineFiltersParser();

// Получение фильтров для категории телефонов
const filters = await parser.getCategoryFilters(
    386, // sectionId
    'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/'
);

console.log(`Получено ${filters.length} фильтров`);
```

### 2. Парсинг фильтров всех категорий

```javascript
// Загрузка категорий из файла
const categories = await parser.loadCategoriesFromFile('categories.txt');

// Парсинг всех категорий
const results = await parser.getAllCategoryFilters(categories, true, true);
```

### 3. Работа с выбранными фильтрами

```javascript
// Получение фильтров с выбранными значениями
const filtersWithSelection = await parser.getCategoryFilters(
    386, // sectionId
    categoryUrl,
    [313025], // selectedValueIds - выбранные значения
    [], // excludedValueIds - исключенные значения
    1000, // selectedMinPrice - минимальная цена
    50000, // selectedMaxPrice - максимальная цена
    'iPhone' // searchPhrase - поисковая фраза
);
```

## Структура данных фильтра

```javascript
{
  _id: "filter_id",
  title: "Название фильтра",
  description: "Описание фильтра",
  type: "checkbox|range|select|...",
  weight: 1,
  values: [
    {
      _id: "value_id",
      title: "Название значения",
      alias: "alias",
      productsCount: 150,
      totalProductsCount: 200,
      popularity: 85,
      groupId: "group_id",
      groupTitle: "Название группы"
    }
  ],
  topValues: [...], // Топ значения
  valueGroups: [...], // Группы значений
  popularity: 90,
  isPublic: true,
  isWrappable: true,
  isExcludable: true,
  useValuesSearch: true
}
```

## Методы парсера

### Основные методы

- `getCategoryFilters(sectionId, categoryUrl, selectedValueIds, excludedValueIds, selectedMinPrice, selectedMaxPrice, searchPhrase)` - получение фильтров категории
- `getAllCategoryFilters(categories, saveProgressively, autoGetTokens)` - парсинг фильтров всех категорий
- `loadCategoriesFromFile(filename)` - загрузка категорий из файла

### Вспомогательные методы

- `filterByType(filters, type)` - фильтрация по типу
- `searchByName(filters, searchTerm)` - поиск по названию
- `saveToFile(data, filename)` - сохранение в JSON
- `saveToCSV(filters, filename)` - сохранение в CSV

## Формат файла категорий

Создайте файл `categories.txt` со списком категорий:

```
# Формат: URL [sectionId]
https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/ sectionId:386
https://hotline.ua/computer/noutbuki/ sectionId:387
https://hotline.ua/computer/planshety/ sectionId:388
```

## Примеры использования

### Пример 1: Базовое использование

```javascript
const HotlineFiltersParser = require('./hotline-filters-parser');

async function basicExample() {
    const parser = new HotlineFiltersParser();
    
    // Получаем фильтры для категории телефонов
    const filters = await parser.getCategoryFilters(
        386,
        'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/'
    );
    
    // Анализируем типы фильтров
    const filterTypes = {};
    filters.forEach(filter => {
        filterTypes[filter.type] = (filterTypes[filter.type] || 0) + 1;
    });
    
    console.log('Типы фильтров:', filterTypes);
    
    // Сохраняем результаты
    await parser.saveToFile(filters, 'JSON/phone-filters.json');
    await parser.saveToCSV(filters, 'CSV/phone-filters.csv');
}

basicExample();
```

### Пример 2: Анализ значений фильтров

```javascript
async function analyzeFilterValues() {
    const parser = new HotlineFiltersParser();
    const filters = await parser.getCategoryFilters(386, categoryUrl);
    
    // Находим фильтр с наибольшим количеством значений
    const filterWithMostValues = filters.reduce((max, filter) => {
        const valueCount = filter.values ? filter.values.length : 0;
        return valueCount > (max.values ? max.values.length : 0) ? filter : max;
    }, {});
    
    console.log(`Фильтр с наибольшим количеством значений: ${filterWithMostValues.title}`);
    console.log(`Количество значений: ${filterWithMostValues.values.length}`);
    
    // Показываем топ-5 значений по популярности
    const topValues = filterWithMostValues.values
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 5);
    
    topValues.forEach((value, index) => {
        console.log(`${index + 1}. ${value.title} (популярность: ${value.popularity})`);
    });
}
```

### Пример 3: Сравнение фильтров с выбором

```javascript
async function compareFilters() {
    const parser = new HotlineFiltersParser();
    
    // Получаем базовые фильтры
    const baseFilters = await parser.getCategoryFilters(386, categoryUrl);
    
    // Получаем фильтры с выбранным брендом Apple
    const appleFilters = await parser.getCategoryFilters(
        386, 
        categoryUrl, 
        [313025] // ID для Apple
    );
    
    // Сравниваем количество значений
    const baseValueCount = baseFilters.reduce((sum, filter) => 
        sum + (filter.values ? filter.values.length : 0), 0);
    const appleValueCount = appleFilters.reduce((sum, filter) => 
        sum + (filter.values ? filter.values.length : 0), 0);
    
    console.log(`Общее количество значений: ${baseValueCount}`);
    console.log(`Количество значений с фильтром Apple: ${appleValueCount}`);
    console.log(`Отфильтровано: ${baseValueCount - appleValueCount} значений`);
}
```

## Настройки

### Основные настройки в main()

```javascript
const PARSE_ALL_CATEGORIES = true; // Парсинг всех категорий из файла
const SINGLE_CATEGORY_URL = 'https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/';
const SINGLE_SECTION_ID = 386; // ID секции для одной категории
const AUTO_GET_TOKENS = true; // Автоматическое получение токенов
```

### Настройки задержек

Парсер автоматически адаптирует задержки между запросами в зависимости от:
- Количества последовательных ошибок
- Процента успешных запросов
- Ограничений сервера

## Структура выходных файлов

### JSON файлы
- `JSON/hotline-filters-{category}.json` - фильтры отдельной категории
- `JSON/hotline-all-filters-report.json` - общий отчет по всем категориям

### CSV файлы
- `CSV/hotline-filters-{category}.csv` - фильтры в CSV формате
- `CSV/hotline-all-filters.csv` - все фильтры в одном CSV файле

### Структура CSV
```
ID,Название,Описание,Тип,Вес,Популярность,Публичный,Оборачиваемый,Исключаемый,Использует поиск значений,Категория,URL категории,Section ID,Количество значений,Количество товаров
```

## Обработка ошибок

Парсер включает встроенную обработку ошибок:
- Автоматические повторные попытки при сбоях
- Fallback на дефолтные токены
- Логирование всех ошибок
- Продолжение работы при ошибках отдельных категорий

## Мониторинг прогресса

Парсер отображает:
- Прогресс-бар с процентом выполнения
- Скорость обработки (категорий/сек)
- Время до завершения (ETA)
- Статистику запросов

## Требования

- Node.js 14+
- Доступ к интернету
- Зависимости: axios, cli-progress, puppeteer

## Запуск

```bash
# Парсинг одной категории
node hotline-filters-parser.js

# Запуск примеров
node example-filters-usage.js
```

## Лицензия

MIT License 