# Инициализация фильтров в базе данных

## Обзор

Система инициализации фильтров позволяет автоматически загружать фильтры из Hotline.ua в базу данных MongoDB для дальнейшего использования в API.

## Компоненты системы

### 1. Модель Filter (`models/Filter.js`)
MongoDB схема для хранения фильтров с полной структурой данных:
- Основная информация фильтра (ID, название, тип, вес)
- Значения фильтра (values, topValues, valueGroups)
- Метаданные (sectionId, categoryUrl, categoryName)
- Индексы для оптимизации запросов

### 2. API маршруты (`routes/filters.js`)
REST API для работы с фильтрами:
- `GET /api/filters` - получение всех фильтров с пагинацией
- `GET /api/filters/:id` - получение фильтра по ID
- `GET /api/filters/section/:sectionId` - фильтры по section ID
- `GET /api/filters/category/:categoryName` - фильтры по названию категории
- `GET /api/filters/types` - все типы фильтров
- `GET /api/filters/sections` - все section ID
- `GET /api/filters/stats` - статистика фильтров
- `POST /api/filters` - создание нового фильтра
- `PUT /api/filters/:id` - обновление фильтра
- `DELETE /api/filters/:id` - удаление фильтра

### 3. Инициализатор (`init-filters-db.js`)
Класс для автоматической загрузки фильтров:
- Подключение к MongoDB
- Загрузка категорий из файла
- Получение фильтров через API Hotline.ua
- Сохранение в базу данных
- Статистика и отчеты

## Использование

### 1. Подготовка файла категорий

Создайте файл `pars/categories-filters.txt` с категориями:

```
# Файл категорий для инициализации фильтров
https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/ sectionId:386
https://hotline.ua/computer/noutbuki/ sectionId:387
https://hotline.ua/home/televizory/ sectionId:393
```

### 2. Запуск инициализации

```bash
# Обычная инициализация
node init-filters-db.js

# Очистка существующих фильтров и новая инициализация
node init-filters-db.js --clear

# Показать статистику базы данных
node init-filters-db.js --stats
```

### 3. Использование API

После инициализации фильтры доступны через API:

```bash
# Получить все фильтры
curl http://localhost:3000/api/filters

# Получить фильтры для конкретной категории
curl http://localhost:3000/api/filters/section/386

# Получить статистику
curl http://localhost:3000/api/filters/stats
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
  useValuesSearch: true,
  sectionId: 386, // ID категории
  categoryUrl: "https://hotline.ua/mobile/mobilnye-telefony-i-smartfony/",
  categoryName: "mobilnye-telefony-i-smartfony"
}
```

## API Endpoints

### Получение фильтров

```javascript
// Все фильтры с пагинацией
GET /api/filters?page=1&limit=50

// Фильтры с фильтрацией
GET /api/filters?sectionId=386&type=checkbox&search=цена

// Фильтры по section ID
GET /api/filters/section/386

// Фильтры по названию категории
GET /api/filters/category/mobilnye-telefony-i-smartfony

// Статистика
GET /api/filters/stats
```

### Управление фильтрами

```javascript
// Создание фильтра
POST /api/filters
{
  "_id": "filter_id",
  "title": "Название",
  "type": "checkbox",
  "sectionId": 386,
  // ... остальные поля
}

// Обновление фильтра
PUT /api/filters/filter_id
{
  "title": "Новое название"
}

// Удаление фильтра
DELETE /api/filters/filter_id
```

## Мониторинг и статистика

### Статистика инициализации
- Общее количество категорий
- Обработанные категории
- Количество фильтров
- Успешно сохраненные фильтры
- Ошибки

### Статистика базы данных
- Общее количество фильтров
- Уникальные категории
- Типы фильтров
- Распределение по категориям

## Обработка ошибок

Система включает обработку ошибок:
- Ошибки подключения к MongoDB
- Ошибки API Hotline.ua
- Ошибки сохранения в базу данных
- Логирование всех операций

## Оптимизация

### Индексы MongoDB
- `sectionId` - для быстрого поиска по категории
- `categoryUrl` - для поиска по URL
- `type` - для фильтрации по типу
- `title` - текстовый индекс для поиска
- `values.title` - текстовый индекс для значений

### Пагинация
- Поддержка пагинации для больших наборов данных
- Настраиваемый размер страницы
- Метаданные пагинации в ответе

## Примеры использования

### Получение фильтров для мобильных телефонов
```javascript
const response = await fetch('/api/filters/section/386');
const filters = await response.json();
console.log(filters.data); // Массив фильтров
```

### Поиск фильтров по названию
```javascript
const response = await fetch('/api/filters?search=цена&limit=10');
const filters = await response.json();
console.log(filters.data); // Фильтры с "цена" в названии
```

### Получение статистики
```javascript
const response = await fetch('/api/filters/stats');
const stats = await response.json();
console.log(stats.data.totalFilters); // Общее количество фильтров
``` 