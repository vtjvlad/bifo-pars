# Диаграмма схемы коллекции Filters

## Структура документа

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FILTER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ _id: String (sectionId_title)                    [PRIMARY KEY]            │
│ title: String (vendor, series, etc.)            [REQUIRED]                │
│ description: String                              [OPTIONAL]                │
│ type: String (checkbox, range, select)          [REQUIRED]                │
│ weight: Number (default: 0)                     [DEFAULT]                 │
│ popularity: Number (default: 0)                 [DEFAULT]                 │
│ isPublic: Boolean (default: true)               [DEFAULT]                 │
│ isWrappable: Boolean (default: false)           [DEFAULT]                 │
│ isExcludable: Boolean (default: false)          [DEFAULT]                 │
│ useValuesSearch: Boolean (default: false)       [DEFAULT]                 │
│ sectionId: Number                               [REQUIRED]                │
│ categoryUrl: String                             [OPTIONAL]                │
│ categoryName: String                            [OPTIONAL]                │
│ __typename: String (default: "Filter")          [DEFAULT]                 │
│ createdAt: Date                                 [AUTO]                    │
│ updatedAt: Date                                 [AUTO]                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                              VALUES                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                        FilterValue[]                                  │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ _id: String (filterId_value_index)                               │ │ │
│ │ │ title: String                                                     │ │ │
│ │ │ alias: String (optional)                                          │ │ │
│ │ │ description: String (optional)                                    │ │ │
│ │ │ weight: Number (default: 0)                                       │ │ │
│ │ │ isNoFollow: Boolean (default: false)                              │ │ │
│ │ │ isPublic: Boolean (default: true)                                 │ │ │
│ │ │ productsCount: Number (default: 0)                                │ │ │
│ │ │ totalProductsCount: Number (default: 0)                           │ │ │
│ │ │ popularity: Number (default: 0)                                   │ │ │
│ │ │ groupId: String (optional)                                        │ │ │
│ │ │ groupTitle: String (optional)                                     │ │ │
│ │ │ __typename: String (default: "FilterValue")                       │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                           TOP VALUES                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                        FilterValue[]                                  │ │
│ │ (Same structure as values, but for top/popular values)               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                         VALUE GROUPS                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                     FilterValueGroup[]                                │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ _id: String                                                       │ │ │
│ │ │ title: String                                                     │ │ │
│ │ │ values: FilterValue[]                                             │ │ │
│ │ │ __typename: String (default: "FilterValueGroup")                  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Связи с другими коллекциями

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    PRODUCTS     │    │     FILTERS     │    │    SECTIONS     │
│                 │    │                 │    │                 │
│ section._id     │───▶│ sectionId       │    │                 │
│ productValues   │───▶│ values          │    │                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Пример данных

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FILTER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ _id: "11_vendor"                                                          │
│ title: "vendor"                                                            │
│ type: "checkbox"                                                           │
│ sectionId: 11                                                              │
│ categoryName: "Смартфоны и мобильные телефоны"                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                              VALUES                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [                                                                     │ │
│ │   {                                                                   │ │
│ │     _id: "11_vendor_value_0",                                        │ │
│ │     title: "OnePlus",                                                 │ │
│ │     isPublic: true,                                                   │ │
│ │     productsCount: 0,                                                 │ │
│ │     popularity: 0                                                     │ │
│ │   },                                                                  │ │
│ │   {                                                                   │ │
│ │     _id: "11_vendor_value_1",                                        │ │
│ │     title: "Apple",                                                   │ │
│ │     isPublic: true,                                                   │ │
│ │     productsCount: 0,                                                 │ │
│ │     popularity: 0                                                     │ │
│ │   }                                                                   │ │
│ │ ]                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Индексы

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INDEXES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ { sectionId: 1 }                    - Поиск фильтров секции               │
│ { categoryUrl: 1 }                  - Поиск по URL категории              │
│ { type: 1 }                         - Поиск по типу фильтра               │
│ { title: 'text' }                   - Текстовый поиск по названию        │
│ { 'values.title': 'text' }          - Текстовый поиск по значениям       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Правила именования

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NAMING RULES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Filter ID: {sectionId}_{title}                                            │
│ Examples:                                                                  │
│   - 11_vendor                                                            │
│   - 11_series                                                            │
│   - 168_brand                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Value ID: {filterId}_value_{index}                                        │
│ Examples:                                                                  │
│   - 11_vendor_value_0                                                    │
│   - 11_vendor_value_1                                                    │
│   - 11_series_value_0                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
``` 