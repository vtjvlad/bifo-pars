/**
 * ES6 модуль для работы с фильтрами на фронтенде
 */

/**
 * Клиентская модель для работы с фильтрами
 */
export class FilterClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
    }

    /**
     * Получить все фильтры для конкретной секции
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
     * Очистить кеш
     */
    clearCache() {
        this.cache.clear();
    }
}

/**
 * Класс для работы с фильтром
 */
export class Filter {
    constructor(data = {}) {
        this._id = data._id || '';
        this.title = data.title || '';
        this.description = data.description || '';
        this.type = data.type || 'checkbox';
        this.weight = data.weight || 0;
        this.values = (data.values || []).map(value => new FilterValue(value));
        this.topValues = (data.topValues || []).map(value => new FilterValue(value));
        this.popularity = data.popularity || 0;
        this.isPublic = data.isPublic !== undefined ? data.isPublic : true;
        this.sectionId = data.sectionId || 0;
        this.categoryName = data.categoryName || '';
    }

    getId() {
        return this._id;
    }

    getDisplayTitle() {
        return this.description || this.title;
    }

    isPublicFilter() {
        return this.isPublic;
    }

    getAllValues() {
        const allValues = [...this.values];
        this.topValues.forEach(topValue => {
            if (!allValues.find(value => value.getId() === topValue.getId())) {
                allValues.unshift(topValue);
            }
        });
        return allValues;
    }

    findValueById(valueId) {
        return this.getAllValues().find(value => value.getId() === valueId) || null;
    }

    searchValues(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAllValues().filter(value => 
            value.getTitle().toLowerCase().includes(lowerQuery)
        );
    }
}

/**
 * Класс для работы со значением фильтра
 */
export class FilterValue {
    constructor(data = {}) {
        this._id = data._id || '';
        this.title = data.title || '';
        this.alias = data.alias || '';
        this.description = data.description || '';
        this.isPublic = data.isPublic !== undefined ? data.isPublic : true;
        this.productsCount = data.productsCount || 0;
        this.totalProductsCount = data.totalProductsCount || 0;
        this.popularity = data.popularity || 0;
    }

    getId() {
        return this._id;
    }

    getTitle() {
        return this.title;
    }

    getDisplayTitle() {
        return this.alias || this.title;
    }

    getProductsCount() {
        return this.productsCount;
    }

    getPopularity() {
        return this.popularity;
    }

    isPublicValue() {
        return this.isPublic;
    }

    getPercentage() {
        if (this.totalProductsCount === 0) return 0;
        return Math.round((this.productsCount / this.totalProductsCount) * 100);
    }
}

/**
 * Утилиты для работы с фильтрами
 */
export class FilterUtils {
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

    static sortFiltersByPriority(filters) {
        return filters.sort((a, b) => {
            if (a.weight !== b.weight) {
                return b.weight - a.weight;
            }
            return b.popularity - a.popularity;
        });
    }

    static getDisplayableFilters(filters) {
        return filters.filter(filter => 
            filter.isPublicFilter() && 
            filter.getAllValues().length > 0
        );
    }
}

// Экспорт по умолчанию
export default FilterClient;