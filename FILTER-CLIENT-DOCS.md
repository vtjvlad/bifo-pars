# FilterClient - Документация для фронтенда

## Обзор

`FilterClient` - это JavaScript модуль для работы с фильтрами товаров на фронтенде. Предоставляет удобный API для получения, кеширования и управления фильтрами.

## Установка и подключение

### ES6 модули (рекомендуется)
```javascript
import { FilterClient, Filter, FilterValue, FilterUtils } from './models/FilterClient.esm.js';
```

### CommonJS (Node.js)
```javascript
const { FilterClient, Filter, FilterValue, FilterUtils } = require('./models/FilterClient.js');
```

### Браузер (глобальные переменные)
```html
<script src="./models/FilterClient.js"></script>
<script>
    const filterClient = new FilterClient();
</script>
```

## Быстрый старт

```javascript
// Создание клиента
const filterClient = new FilterClient('/api');

// Получение фильтров для секции
const filters = await filterClient.getFiltersBySection(11);

// Отображение фильтров
filters.forEach(filter => {
    console.log(`${filter.getDisplayTitle()}: ${filter.getAllValues().length} значений`);
});
```

## API Reference

### FilterClient

#### Конструктор
```javascript
const filterClient = new FilterClient(baseUrl = '/api');
```

#### Методы

##### getFiltersBySection(sectionId, useCache = true)
Получить все фильтры для конкретной секции.

```javascript
const filters = await filterClient.getFiltersBySection(11);
// Возвращает: Filter[]
```

##### getFilterById(filterId)
Получить конкретный фильтр по ID.

```javascript
const filter = await filterClient.getFilterById('11_vendor');
// Возвращает: Filter
```

##### searchFilters(query, sectionId = null)
Поиск фильтров по тексту.

```javascript
const results = await filterClient.searchFilters('apple', 11);
// Возвращает: Filter[]
```

##### clearCache()
Очистить кеш.

```javascript
filterClient.clearCache();
```

### Filter

#### Основные методы

```javascript
const filter = new Filter(data);

filter.getId()              // Получить ID фильтра
filter.getDisplayTitle()    // Получить отображаемое название
filter.isPublicFilter()     // Проверить, публичный ли фильтр
filter.getAllValues()       // Получить все значения
filter.findValueById(id)    // Найти значение по ID
filter.searchValues(query)  // Поиск значений по тексту
```

### FilterValue

#### Основные методы

```javascript
const value = new FilterValue(data);

value.getId()               // Получить ID значения
value.getTitle()            // Получить название
value.getDisplayTitle()     // Получить отображаемое название
value.getProductsCount()    // Получить количество товаров
value.getPopularity()       // Получить популярность
value.getPercentage()       // Получить процент от общего количества
```

### FilterUtils

#### Утилиты

```javascript
// Группировка по типу
const grouped = FilterUtils.groupFiltersByType(filters);

// Сортировка по приоритету
const sorted = FilterUtils.sortFiltersByPriority(filters);

// Получить отображаемые фильтры
const displayable = FilterUtils.getDisplayableFilters(filters);
```

## Примеры использования

### Базовое отображение фильтров

```javascript
async function renderFilters(sectionId) {
    try {
        const filters = await filterClient.getFiltersBySection(sectionId);
        const displayable = FilterUtils.getDisplayableFilters(filters);
        
        displayable.forEach(filter => {
            console.log(`Фильтр: ${filter.getDisplayTitle()}`);
            filter.getAllValues().forEach(value => {
                console.log(`  - ${value.getDisplayTitle()} (${value.getProductsCount()})`);
            });
        });
    } catch (error) {
        console.error('Ошибка:', error);
    }
}
```

### React компонент

```jsx
function FiltersComponent({ sectionId, onFilterChange }) {
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedValues, setSelectedValues] = useState(new Set());

    useEffect(() => {
        loadFilters();
    }, [sectionId]);

    const loadFilters = async () => {
        try {
            setLoading(true);
            const data = await filterClient.getFiltersBySection(sectionId);
            const displayable = FilterUtils.getDisplayableFilters(data);
            setFilters(FilterUtils.sortFiltersByPriority(displayable));
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (valueId, checked) => {
        const newSelected = new Set(selectedValues);
        if (checked) {
            newSelected.add(valueId);
        } else {
            newSelected.delete(valueId);
        }
        setSelectedValues(newSelected);
        onFilterChange?.(Array.from(newSelected));
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className="filters">
            {filters.map(filter => (
                <div key={filter.getId()} className="filter-group">
                    <h3>{filter.getDisplayTitle()}</h3>
                    {filter.getAllValues().map(value => (
                        <label key={value.getId()} className="filter-option">
                            <input
                                type="checkbox"
                                checked={selectedValues.has(value.getId())}
                                onChange={(e) => handleValueChange(value.getId(), e.target.checked)}
                            />
                            {value.getDisplayTitle()} ({value.getProductsCount()})
                        </label>
                    ))}
                </div>
            ))}
        </div>
    );
}
```

### Vue.js компонент

```vue
<template>
  <div class="filters">
    <div v-if="loading">Загрузка...</div>
    <div v-else>
      <div v-for="filter in filters" :key="filter.getId()" class="filter-group">
        <h3>{{ filter.getDisplayTitle() }}</h3>
        <label v-for="value in filter.getAllValues()" :key="value.getId()" class="filter-option">
          <input
            type="checkbox"
            :checked="selectedValues.has(value.getId())"
            @change="handleValueChange(value.getId(), $event.target.checked)"
          />
          {{ value.getDisplayTitle() }} ({{ value.getProductsCount() }})
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import { FilterClient, FilterUtils } from '../models/FilterClient.esm.js';

export default {
  props: ['sectionId'],
  data() {
    return {
      filterClient: new FilterClient('/api'),
      filters: [],
      loading: true,
      selectedValues: new Set()
    };
  },
  watch: {
    sectionId: 'loadFilters'
  },
  mounted() {
    this.loadFilters();
  },
  methods: {
    async loadFilters() {
      try {
        this.loading = true;
        const data = await this.filterClient.getFiltersBySection(this.sectionId);
        const displayable = FilterUtils.getDisplayableFilters(data);
        this.filters = FilterUtils.sortFiltersByPriority(displayable);
      } catch (error) {
        console.error('Ошибка:', error);
      } finally {
        this.loading = false;
      }
    },
    handleValueChange(valueId, checked) {
      if (checked) {
        this.selectedValues.add(valueId);
      } else {
        this.selectedValues.delete(valueId);
      }
      this.$emit('filter-change', Array.from(this.selectedValues));
    }
  }
};
</script>
```

### Управление состоянием фильтров

```javascript
class FilterManager {
    constructor() {
        this.selectedFilters = new Map();
        this.callbacks = [];
    }

    // Подписка на изменения
    onChange(callback) {
        this.callbacks.push(callback);
    }

    // Установка значения
    setValue(filterId, valueId, selected) {
        if (!this.selectedFilters.has(filterId)) {
            this.selectedFilters.set(filterId, new Set());
        }
        
        const values = this.selectedFilters.get(filterId);
        if (selected) {
            values.add(valueId);
        } else {
            values.delete(valueId);
        }
        
        if (values.size === 0) {
            this.selectedFilters.delete(filterId);
        }
        
        this.notifyCallbacks();
    }

    // Получение выбранных значений
    getSelectedValues() {
        const result = {};
        this.selectedFilters.forEach((values, filterId) => {
            result[filterId] = Array.from(values);
        });
        return result;
    }

    // Очистка
    clear() {
        this.selectedFilters.clear();
        this.notifyCallbacks();
    }

    notifyCallbacks() {
        const selected = this.getSelectedValues();
        this.callbacks.forEach(callback => callback(selected));
    }
}

// Использование
const filterManager = new FilterManager();

filterManager.onChange((selectedValues) => {
    console.log('Фильтры изменились:', selectedValues);
    // Отправка запроса на сервер для фильтрации товаров
});
```

## API Endpoints

### Получение фильтров секции
```
GET /api/filters/section/:sectionId
```

### Получение конкретного фильтра
```
GET /api/filters/:filterId
```

### Поиск фильтров
```
GET /api/filters/search?q=query&sectionId=11
```

### Популярные фильтры
```
GET /api/filters/popular?limit=10
```

### Статистика
```
GET /api/filters/stats
```

## Кеширование

FilterClient автоматически кеширует результаты запросов на 5 минут. Кеш можно управлять:

```javascript
// Проверка статистики кеша
const stats = filterClient.getCacheStats();

// Очистка кеша
filterClient.clearCache();

// Отключение кеша для конкретного запроса
const filters = await filterClient.getFiltersBySection(11, false);
```

## Обработка ошибок

```javascript
try {
    const filters = await filterClient.getFiltersBySection(11);
    // Работа с фильтрами
} catch (error) {
    if (error.name === 'NetworkError') {
        console.error('Проблемы с сетью');
    } else if (error.status === 404) {
        console.error('Фильтры не найдены');
    } else {
        console.error('Неизвестная ошибка:', error);
    }
}
```

## Лучшие практики

1. **Используйте кеш** для улучшения производительности
2. **Группируйте фильтры** по типам для лучшего UX
3. **Сортируйте фильтры** по важности/популярности
4. **Обрабатывайте ошибки** корректно
5. **Показывайте индикаторы загрузки** при асинхронных операциях
6. **Дебаунсите поиск** для снижения нагрузки на сервер

## TypeScript поддержка

Если используете TypeScript, можете добавить типы:

```typescript
interface FilterData {
    _id: string;
    title: string;
    type: 'checkbox' | 'range' | 'select';
    sectionId: number;
    values: FilterValueData[];
}

interface FilterValueData {
    _id: string;
    title: string;
    productsCount: number;
    popularity: number;
}
```