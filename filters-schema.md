# Схема коллекции Filters

## Обзор

Коллекция `filters` предназначена для хранения фильтров товаров, извлеченных из поля `productValues` коллекции `products`. Каждый фильтр представляет собой группу значений для определенной характеристики товаров в рамках конкретной секции (категории).

## Структура документа

### Основные поля фильтра

```javascript
{
  _id: String,                    // Уникальный ID фильтра (sectionId_title)
  title: String,                  // Название фильтра (например: "vendor", "series")
  description: String,            // Описание фильтра (опционально)
  type: String,                   // Тип фильтра: "checkbox", "range", "select"
  weight: Number,                 // Вес/приоритет фильтра (по умолчанию: 0)
  values: [FilterValue],          // Массив значений фильтра
  topValues: [FilterValue],       // Топ значения (опционально)
  valueGroups: [FilterValueGroup], // Группы значений (опционально)
  popularity: Number,             // Популярность фильтра (по умолчанию: 0)
  isPublic: Boolean,              // Публичный ли фильтр (по умолчанию: true)
  isWrappable: Boolean,           // Можно ли обернуть (по умолчанию: false)
  isExcludable: Boolean,          // Можно ли исключить (по умолчанию: false)
  useValuesSearch: Boolean,       // Использовать поиск по значениям (по умолчанию: false)
  sectionId: Number,              // ID секции/категории
  categoryUrl: String,            // URL категории (опционально)
  categoryName: String,           // Название категории (опционально)
  __typename: String,             // Тип объекта (по умолчанию: "Filter")
  createdAt: Date,                // Дата создания (автоматически)
  updatedAt: Date                 // Дата обновления (автоматически)
}
```

### Схема значения фильтра (FilterValue)

```javascript
{
  _id: String,                    // Уникальный ID значения
  isNoFollow: Boolean,            // Не следовать по ссылке (по умолчанию: false)
  title: String,                  // Название значения
  alias: String,                  // Алиас (опционально)
  description: String,            // Описание (опционально)
  weight: Number,                 // Вес значения (по умолчанию: 0)
  isPublic: Boolean,              // Публичное ли значение (по умолчанию: true)
  productsCount: Number,          // Количество товаров с этим значением (по умолчанию: 0)
  totalProductsCount: Number,     // Общее количество товаров (по умолчанию: 0)
  popularity: Number,             // Популярность значения (по умолчанию: 0)
  groupId: String,                // ID группы (опционально)
  groupTitle: String,             // Название группы (опционально)
  __typename: String              // Тип объекта (по умолчанию: "FilterValue")
}
```

### Схема группы значений (FilterValueGroup)

```javascript
{
  _id: String,                    // Уникальный ID группы
  title: String,                  // Название группы
  values: [FilterValue],          // Массив значений в группе
  __typename: String              // Тип объекта (по умолчанию: "FilterValueGroup")
}
```

## Пример документа

```javascript
{
  "_id": "11_vendor",
  "title": "vendor",
  "description": "Производитель товара",
  "type": "checkbox",
  "weight": 0,
  "values": [
    {
      "_id": "11_vendor_value_0",
      "title": "OnePlus",
      "isPublic": true,
      "productsCount": 0,
      "totalProductsCount": 0,
      "popularity": 0,
      "__typename": "FilterValue"
    },
    {
      "_id": "11_vendor_value_1", 
      "title": "Apple",
      "isPublic": true,
      "productsCount": 0,
      "totalProductsCount": 0,
      "popularity": 0,
      "__typename": "FilterValue"
    }
  ],
  "topValues": [],
  "valueGroups": [],
  "popularity": 0,
  "isPublic": true,
  "isWrappable": false,
  "isExcludable": false,
  "useValuesSearch": false,
  "sectionId": 11,
  "categoryUrl": "/mobile/mobilnye-telefony-i-smartfony/",
  "categoryName": "Смартфоны и мобильные телефоны",
  "__typename": "Filter",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Индексы

Для оптимизации запросов созданы следующие индексы:

```javascript
// Индекс по sectionId для быстрого поиска фильтров секции
{ sectionId: 1 }

// Индекс по URL категории
{ categoryUrl: 1 }

// Индекс по типу фильтра
{ type: 1 }

// Текстовый индекс по названию фильтра
{ title: 'text' }

// Текстовый индекс по названиям значений
{ 'values.title': 'text' }
```

## Правила именования

### ID фильтра
```
{sectionId}_{title}
```
Пример: `11_vendor`, `11_series`

### ID значения фильтра
```
{filterId}_value_{index}
```
Пример: `11_vendor_value_0`, `11_vendor_value_1`

## Типы фильтров

- `checkbox` - Чекбоксы (множественный выбор)
- `range` - Диапазон (минимальное-максимальное значение)
- `select` - Выпадающий список (одиночный выбор)

## Связи с другими коллекциями

### Связь с products
- `sectionId` соответствует `section._id` в коллекции `products`
- Значения фильтров извлекаются из `productValues` в коллекции `products`

### Связь с sections (если существует)
- `sectionId` может ссылаться на коллекцию секций/категорий

## Операции

### Создание фильтра
```javascript
const filter = new Filter({
  _id: '11_vendor',
  title: 'vendor',
  type: 'checkbox',
  sectionId: 11,
  values: [...]
});
await filter.save();
```

### Поиск фильтров секции
```javascript
const filters = await Filter.find({ sectionId: 11 });
```

### Поиск по тексту
```javascript
const filters = await Filter.find({ 
  $text: { $search: "vendor" } 
});
```

### Обновление фильтра
```javascript
await Filter.findByIdAndUpdate('11_vendor', {
  $push: { values: newValue }
});
```

## Валидация

- `_id` должен быть уникальным
- `title` обязательное поле
- `type` обязательное поле
- `sectionId` обязательное поле
- `values` массив объектов FilterValue
- Все даты автоматически управляются Mongoose

## Производительность

- Используйте индексы для быстрых запросов
- Ограничивайте выборку полей с помощью `.select()`
- Используйте `.lean()` для больших выборок
- Кэшируйте часто используемые фильтры 