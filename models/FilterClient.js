/**
 * Клиентская модель для работы с фильтрами
 * Используется на фронтенде для получения и управления данными фильтров
 */

class FilterClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
    }

    /**
     * Получить все фильтры для конкретной секции
     * @param {number} sectionId - ID секции
     * @param {boolean} useCache - Использовать кеш
     * @returns {Promise<Filter[]>}
     */
    async getFiltersBySection(sectionId, useCache = true) {
        const cacheKey = `section_${sectionId}`;
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(`${this.baseUrl}/filters/section/${sectionId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const filters = await response.json();
            const processedFilters = filters.map(filter => new Filter(filter));
            
            // Кешируем результат
            this.cache.set(cacheKey, {
                data: processedFilters,
                timestamp: Date.now()
            });
            
            return processedFilters;
        } catch (error) {
            console.error('Ошибка при получении фильтров:', error);
            throw error;
        }
    }

    /**
     * Получить конкретный фильтр по ID
     * @param {string} filterId - ID фильтра
     * @returns {Promise<Filter>}
     */
    async getFilterById(filterId) {
        try {
            const response = await fetch(`${this.baseUrl}/filters/${filterId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const filterData = await response.json();
            return new Filter(filterData);
        } catch (error) {
            console.error('Ошибка при получении фильтра:', error);
            throw error;
        }
    }

    /**
     * Поиск фильтров по тексту
     * @param {string} query - Поисковый запрос
     * @param {number} sectionId - ID секции (опционально)
     * @returns {Promise<Filter[]>}
     */
    async searchFilters(query, sectionId = null) {
        try {
            const params = new URLSearchParams({ q: query });
            if (sectionId) {
                params.append('sectionId', sectionId);
            }
            
            const response = await fetch(`${this.baseUrl}/filters/search?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const filters = await response.json();
            return filters.map(filter => new Filter(filter));
        } catch (error) {
            console.error('Ошибка при поиске фильтров:', error);
            throw error;
        }
    }

    /**
     * Получить популярные фильтры
     * @param {number} limit - Количество фильтров
     * @returns {Promise<Filter[]>}
     */
    async getPopularFilters(limit = 10) {
        try {
            const response = await fetch(`${this.baseUrl}/filters/popular?limit=${limit}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const filters = await response.json();
            return filters.map(filter => new Filter(filter));
        } catch (error) {
            console.error('Ошибка при получении популярных фильтров:', error);
            throw error;
        }
    }

    /**
     * Очистить кеш
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Получить статистику использования кеша
     * @returns {Object}
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

/**
 * Класс для работы с фильтром
 */
class Filter {
    constructor(data = {}) {
        this._id = data._id || '';
        this.title = data.title || '';
        this.description = data.description || '';
        this.type = data.type || 'checkbox';
        this.weight = data.weight || 0;
        this.values = (data.values || []).map(value => new FilterValue(value));
        this.topValues = (data.topValues || []).map(value => new FilterValue(value));
        this.valueGroups = (data.valueGroups || []).map(group => new FilterValueGroup(group));
        this.popularity = data.popularity || 0;
        this.isPublic = data.isPublic !== undefined ? data.isPublic : true;
        this.isWrappable = data.isWrappable || false;
        this.isExcludable = data.isExcludable || false;
        this.useValuesSearch = data.useValuesSearch || false;
        this.sectionId = data.sectionId || 0;
        this.categoryUrl = data.categoryUrl || '';
        this.categoryName = data.categoryName || '';
        this.__typename = data.__typename || 'Filter';
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    /**
     * Получить ID фильтра
     * @returns {string}
     */
    getId() {
        return this._id;
    }

    /**
     * Получить отображаемое название
     * @returns {string}
     */
    getDisplayTitle() {
        return this.description || this.title;
    }

    /**
     * Проверить, является ли фильтр публичным
     * @returns {boolean}
     */
    isPublicFilter() {
        return this.isPublic;
    }

    /**
     * Получить все значения (включая топ значения)
     * @returns {FilterValue[]}
     */
    getAllValues() {
        const allValues = [...this.values];
        
        // Добавляем топ значения, если их нет в основных
        this.topValues.forEach(topValue => {
            if (!allValues.find(value => value.getId() === topValue.getId())) {
                allValues.unshift(topValue);
            }
        });
        
        return allValues;
    }

    /**
     * Найти значение по ID
     * @param {string} valueId - ID значения
     * @returns {FilterValue|null}
     */
    findValueById(valueId) {
        return this.getAllValues().find(value => value.getId() === valueId) || null;
    }

    /**
     * Найти значения по тексту
     * @param {string} query - Поисковый запрос
     * @returns {FilterValue[]}
     */
    searchValues(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAllValues().filter(value => 
            value.getTitle().toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Получить значения, отсортированные по популярности
     * @returns {FilterValue[]}
     */
    getValuesByPopularity() {
        return this.getAllValues().sort((a, b) => b.getPopularity() - a.getPopularity());
    }

    /**
     * Получить JSON представление
     * @returns {Object}
     */
    toJSON() {
        return {
            _id: this._id,
            title: this.title,
            description: this.description,
            type: this.type,
            weight: this.weight,
            values: this.values.map(value => value.toJSON()),
            topValues: this.topValues.map(value => value.toJSON()),
            valueGroups: this.valueGroups.map(group => group.toJSON()),
            popularity: this.popularity,
            isPublic: this.isPublic,
            isWrappable: this.isWrappable,
            isExcludable: this.isExcludable,
            useValuesSearch: this.useValuesSearch,
            sectionId: this.sectionId,
            categoryUrl: this.categoryUrl,
            categoryName: this.categoryName,
            __typename: this.__typename,
            createdAt: this.createdAt?.toISOString(),
            updatedAt: this.updatedAt?.toISOString()
        };
    }
}

/**
 * Класс для работы со значением фильтра
 */
class FilterValue {
    constructor(data = {}) {
        this._id = data._id || '';
        this.isNoFollow = data.isNoFollow || false;
        this.title = data.title || '';
        this.alias = data.alias || '';
        this.description = data.description || '';
        this.weight = data.weight || 0;
        this.isPublic = data.isPublic !== undefined ? data.isPublic : true;
        this.productsCount = data.productsCount || 0;
        this.totalProductsCount = data.totalProductsCount || 0;
        this.popularity = data.popularity || 0;
        this.groupId = data.groupId || '';
        this.groupTitle = data.groupTitle || '';
        this.__typename = data.__typename || 'FilterValue';
    }

    /**
     * Получить ID значения
     * @returns {string}
     */
    getId() {
        return this._id;
    }

    /**
     * Получить название значения
     * @returns {string}
     */
    getTitle() {
        return this.title;
    }

    /**
     * Получить отображаемое название
     * @returns {string}
     */
    getDisplayTitle() {
        return this.alias || this.title;
    }

    /**
     * Получить описание
     * @returns {string}
     */
    getDescription() {
        return this.description;
    }

    /**
     * Получить количество товаров
     * @returns {number}
     */
    getProductsCount() {
        return this.productsCount;
    }

    /**
     * Получить популярность
     * @returns {number}
     */
    getPopularity() {
        return this.popularity;
    }

    /**
     * Проверить, является ли значение публичным
     * @returns {boolean}
     */
    isPublicValue() {
        return this.isPublic;
    }

    /**
     * Получить процент от общего количества товаров
     * @returns {number}
     */
    getPercentage() {
        if (this.totalProductsCount === 0) return 0;
        return Math.round((this.productsCount / this.totalProductsCount) * 100);
    }

    /**
     * Получить JSON представление
     * @returns {Object}
     */
    toJSON() {
        return {
            _id: this._id,
            isNoFollow: this.isNoFollow,
            title: this.title,
            alias: this.alias,
            description: this.description,
            weight: this.weight,
            isPublic: this.isPublic,
            productsCount: this.productsCount,
            totalProductsCount: this.totalProductsCount,
            popularity: this.popularity,
            groupId: this.groupId,
            groupTitle: this.groupTitle,
            __typename: this.__typename
        };
    }
}

/**
 * Класс для работы с группой значений фильтра
 */
class FilterValueGroup {
    constructor(data = {}) {
        this._id = data._id || '';
        this.title = data.title || '';
        this.values = (data.values || []).map(value => new FilterValue(value));
        this.__typename = data.__typename || 'FilterValueGroup';
    }

    /**
     * Получить ID группы
     * @returns {string}
     */
    getId() {
        return this._id;
    }

    /**
     * Получить название группы
     * @returns {string}
     */
    getTitle() {
        return this.title;
    }

    /**
     * Получить значения группы
     * @returns {FilterValue[]}
     */
    getValues() {
        return this.values;
    }

    /**
     * Найти значение в группе по ID
     * @param {string} valueId - ID значения
     * @returns {FilterValue|null}
     */
    findValueById(valueId) {
        return this.values.find(value => value.getId() === valueId) || null;
    }

    /**
     * Получить JSON представление
     * @returns {Object}
     */
    toJSON() {
        return {
            _id: this._id,
            title: this.title,
            values: this.values.map(value => value.toJSON()),
            __typename: this.__typename
        };
    }
}

/**
 * Утилиты для работы с фильтрами
 */
class FilterUtils {
    /**
     * Создать URL для API запроса
     * @param {string} endpoint - Конечная точка
     * @param {Object} params - Параметры запроса
     * @returns {string}
     */
    static buildApiUrl(endpoint, params = {}) {
        const url = new URL(endpoint, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    /**
     * Группировать фильтры по типу
     * @param {Filter[]} filters - Массив фильтров
     * @returns {Object}
     */
    static groupFiltersByType(filters) {
        return filters.reduce((groups, filter) => {
            const type = filter.type;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(filter);
            return groups;
        }, {});
    }

    /**
     * Отсортировать фильтры по весу и популярности
     * @param {Filter[]} filters - Массив фильтров
     * @returns {Filter[]}
     */
    static sortFiltersByPriority(filters) {
        return filters.sort((a, b) => {
            // Сначала по весу (больше = выше)
            if (a.weight !== b.weight) {
                return b.weight - a.weight;
            }
            // Затем по популярности (больше = выше)
            return b.popularity - a.popularity;
        });
    }

    /**
     * Получить фильтры, подходящие для отображения
     * @param {Filter[]} filters - Массив фильтров
     * @returns {Filter[]}
     */
    static getDisplayableFilters(filters) {
        return filters.filter(filter => 
            filter.isPublicFilter() && 
            filter.getAllValues().length > 0
        );
    }
}

// Экспорт для разных модульных систем
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        FilterClient,
        Filter,
        FilterValue,
        FilterValueGroup,
        FilterUtils
    };
} else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function() {
        return {
            FilterClient,
            Filter,
            FilterValue,
            FilterValueGroup,
            FilterUtils
        };
    });
} else {
    // Браузер
    window.FilterClient = FilterClient;
    window.Filter = Filter;
    window.FilterValue = FilterValue;
    window.FilterValueGroup = FilterValueGroup;
    window.FilterUtils = FilterUtils;
}