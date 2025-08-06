/**
 * Примеры использования FilterClient на фронтенде
 */

// ========== ПРИМЕР 1: Базовое использование ==========

// Импорт для ES6 модулей
import { FilterClient, FilterUtils } from '../models/FilterClient.esm.js';

// Или для CommonJS
// const { FilterClient, FilterUtils } = require('../models/FilterClient.js');

// Создание клиента
const filterClient = new FilterClient('/api');

// ========== ПРИМЕР 2: Получение фильтров для секции ==========

async function loadFiltersForSection(sectionId) {
    try {
        console.log(`Загружаем фильтры для секции ${sectionId}...`);
        
        const filters = await filterClient.getFiltersBySection(sectionId);
        
        console.log(`Найдено ${filters.length} фильтров:`);
        filters.forEach(filter => {
            console.log(`- ${filter.getDisplayTitle()} (${filter.getAllValues().length} значений)`);
        });
        
        return filters;
    } catch (error) {
        console.error('Ошибка при загрузке фильтров:', error);
        return [];
    }
}

// ========== ПРИМЕР 3: Отображение фильтров в HTML ==========

async function renderFiltersHTML(sectionId, containerId) {
    const filters = await filterClient.getFiltersBySection(sectionId);
    const displayableFilters = FilterUtils.getDisplayableFilters(filters);
    const sortedFilters = FilterUtils.sortFiltersByPriority(displayableFilters);
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    sortedFilters.forEach(filter => {
        const filterElement = createFilterElement(filter);
        container.appendChild(filterElement);
    });
}

function createFilterElement(filter) {
    const div = document.createElement('div');
    div.className = 'filter-block';
    div.innerHTML = `
        <h3 class="filter-title">${filter.getDisplayTitle()}</h3>
        <div class="filter-values">
            ${filter.getAllValues().map(value => `
                <label class="filter-value">
                    <input type="${filter.type === 'checkbox' ? 'checkbox' : 'radio'}" 
                           name="filter_${filter.getId()}" 
                           value="${value.getId()}">
                    <span>${value.getDisplayTitle()}</span>
                    <span class="count">(${value.getProductsCount()})</span>
                </label>
            `).join('')}
        </div>
    `;
    return div;
}

// ========== ПРИМЕР 4: React компонент ==========

// Пример компонента на React
function FilterComponent({ sectionId }) {
    const [filters, setFilters] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedValues, setSelectedValues] = React.useState(new Set());

    React.useEffect(() => {
        loadFilters();
    }, [sectionId]);

    const loadFilters = async () => {
        try {
            setLoading(true);
            const filterData = await filterClient.getFiltersBySection(sectionId);
            const displayable = FilterUtils.getDisplayableFilters(filterData);
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
    };

    if (loading) {
        return React.createElement('div', { className: 'loading' }, 'Загрузка фильтров...');
    }

    return React.createElement('div', { className: 'filters-container' },
        filters.map(filter => 
            React.createElement('div', { 
                key: filter.getId(),
                className: 'filter-block'
            },
                React.createElement('h3', { className: 'filter-title' }, filter.getDisplayTitle()),
                React.createElement('div', { className: 'filter-values' },
                    filter.getAllValues().map(value =>
                        React.createElement('label', {
                            key: value.getId(),
                            className: 'filter-value'
                        },
                            React.createElement('input', {
                                type: filter.type === 'checkbox' ? 'checkbox' : 'radio',
                                name: `filter_${filter.getId()}`,
                                value: value.getId(),
                                checked: selectedValues.has(value.getId()),
                                onChange: (e) => handleValueChange(value.getId(), e.target.checked)
                            }),
                            React.createElement('span', null, value.getDisplayTitle()),
                            React.createElement('span', { className: 'count' }, `(${value.getProductsCount()})`)
                        )
                    )
                )
            )
        )
    );
}

// ========== ПРИМЕР 5: Vue.js компонент ==========

const FilterVueComponent = {
    props: ['sectionId'],
    data() {
        return {
            filters: [],
            loading: true,
            selectedValues: new Set()
        };
    },
    async mounted() {
        await this.loadFilters();
    },
    watch: {
        sectionId: {
            handler: 'loadFilters',
            immediate: true
        }
    },
    methods: {
        async loadFilters() {
            try {
                this.loading = true;
                const filterData = await filterClient.getFiltersBySection(this.sectionId);
                const displayable = FilterUtils.getDisplayableFilters(filterData);
                this.filters = FilterUtils.sortFiltersByPriority(displayable);
            } catch (error) {
                console.error('Ошибка загрузки фильтров:', error);
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
    },
    template: `
        <div class="filters-container">
            <div v-if="loading" class="loading">Загрузка фильтров...</div>
            <div v-else>
                <div v-for="filter in filters" :key="filter.getId()" class="filter-block">
                    <h3 class="filter-title">{{ filter.getDisplayTitle() }}</h3>
                    <div class="filter-values">
                        <label v-for="value in filter.getAllValues()" :key="value.getId()" class="filter-value">
                            <input 
                                :type="filter.type === 'checkbox' ? 'checkbox' : 'radio'"
                                :name="'filter_' + filter.getId()"
                                :value="value.getId()"
                                :checked="selectedValues.has(value.getId())"
                                @change="handleValueChange(value.getId(), $event.target.checked)"
                            >
                            <span>{{ value.getDisplayTitle() }}</span>
                            <span class="count">({{ value.getProductsCount() }})</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `
};

// ========== ПРИМЕР 6: Поиск фильтров ==========

async function searchFiltersExample(query, sectionId = null) {
    try {
        console.log(`Поиск фильтров: "${query}"`);
        
        const results = await filterClient.searchFilters(query, sectionId);
        
        console.log(`Найдено ${results.length} фильтров:`);
        results.forEach(filter => {
            console.log(`- ${filter.getDisplayTitle()} (секция: ${filter.sectionId})`);
            
            // Поиск в значениях
            const matchingValues = filter.searchValues(query);
            if (matchingValues.length > 0) {
                console.log(`  Найденные значения: ${matchingValues.map(v => v.getTitle()).join(', ')}`);
            }
        });
        
        return results;
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        return [];
    }
}

// ========== ПРИМЕР 7: Работа с кешем ==========

function cacheExample() {
    // Получение статистики кеша
    const stats = filterClient.getCacheStats();
    console.log('Статистика кеша:', stats);
    
    // Очистка кеша
    filterClient.clearCache();
    console.log('Кеш очищен');
}

// ========== ПРИМЕР 8: Группировка фильтров ==========

async function groupFiltersExample(sectionId) {
    const filters = await filterClient.getFiltersBySection(sectionId);
    const grouped = FilterUtils.groupFiltersByType(filters);
    
    console.log('Фильтры по типам:');
    Object.keys(grouped).forEach(type => {
        console.log(`${type}: ${grouped[type].length} фильтров`);
        grouped[type].forEach(filter => {
            console.log(`  - ${filter.getDisplayTitle()}`);
        });
    });
    
    return grouped;
}

// ========== ПРИМЕР 9: Обработка выбранных фильтров ==========

class FilterManager {
    constructor() {
        this.selectedFilters = new Map(); // filterId -> Set of valueIds
        this.callbacks = [];
    }

    // Добавить обработчик изменений
    onChange(callback) {
        this.callbacks.push(callback);
    }

    // Установить значение фильтра
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
        
        // Удаляем пустые наборы
        if (values.size === 0) {
            this.selectedFilters.delete(filterId);
        }
        
        this.notifyCallbacks();
    }

    // Получить выбранные значения
    getSelectedValues() {
        const result = {};
        this.selectedFilters.forEach((values, filterId) => {
            result[filterId] = Array.from(values);
        });
        return result;
    }

    // Очистить все выборы
    clear() {
        this.selectedFilters.clear();
        this.notifyCallbacks();
    }

    // Уведомить обработчики
    notifyCallbacks() {
        const selectedValues = this.getSelectedValues();
        this.callbacks.forEach(callback => callback(selectedValues));
    }
}

// Использование FilterManager
const filterManager = new FilterManager();

filterManager.onChange((selectedValues) => {
    console.log('Выбранные фильтры изменились:', selectedValues);
    // Здесь можно отправить запрос на сервер для фильтрации товаров
});

// ========== ЭКСПОРТ ПРИМЕРОВ ==========

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadFiltersForSection,
        renderFiltersHTML,
        FilterComponent,
        FilterVueComponent,
        searchFiltersExample,
        cacheExample,
        groupFiltersExample,
        FilterManager
    };
}