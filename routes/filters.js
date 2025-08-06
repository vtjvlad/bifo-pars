const express = require('express');
const Filter = require('../models/Filter');
const router = express.Router();

/**
 * GET /api/filters/section/:sectionId
 * Получить все фильтры для конкретной секции
 */
router.get('/section/:sectionId', async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { limit, offset, type } = req.query;

        // Базовый запрос
        const query = { sectionId: parseInt(sectionId) };
        
        // Фильтр по типу
        if (type) {
            query.type = type;
        }

        // Построение запроса с пагинацией
        let dbQuery = Filter.find(query)
            .select('-__v')
            .sort({ weight: -1, popularity: -1 });

        if (limit) {
            dbQuery = dbQuery.limit(parseInt(limit));
        }

        if (offset) {
            dbQuery = dbQuery.skip(parseInt(offset));
        }

        const filters = await dbQuery.lean();
        
        // Получаем общее количество для пагинации
        const total = await Filter.countDocuments(query);

        res.json({
            filters,
            pagination: {
                total,
                limit: limit ? parseInt(limit) : filters.length,
                offset: offset ? parseInt(offset) : 0
            }
        });
    } catch (error) {
        console.error('Ошибка при получении фильтров секции:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении фильтров',
            message: error.message 
        });
    }
});

/**
 * GET /api/filters/:filterId
 * Получить конкретный фильтр по ID
 */
router.get('/:filterId', async (req, res) => {
    try {
        const { filterId } = req.params;

        const filter = await Filter.findById(filterId)
            .select('-__v')
            .lean();

        if (!filter) {
            return res.status(404).json({ 
                error: 'Фильтр не найден',
                filterId 
            });
        }

        res.json(filter);
    } catch (error) {
        console.error('Ошибка при получении фильтра:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении фильтра',
            message: error.message 
        });
    }
});

/**
 * GET /api/filters/search
 * Поиск фильтров по тексту
 */
router.get('/search', async (req, res) => {
    try {
        const { q: query, sectionId, limit = 20, offset = 0 } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ 
                error: 'Поисковый запрос должен содержать минимум 2 символа' 
            });
        }

        // Базовый запрос для текстового поиска
        const searchQuery = {
            $text: { $search: query }
        };

        // Добавляем фильтр по секции если указан
        if (sectionId) {
            searchQuery.sectionId = parseInt(sectionId);
        }

        const filters = await Filter.find(searchQuery)
            .select('-__v')
            .score({ $meta: 'textScore' })
            .sort({ score: { $meta: 'textScore' }, weight: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .lean();

        const total = await Filter.countDocuments(searchQuery);

        res.json({
            filters,
            query: query,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Ошибка при поиске фильтров:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при поиске фильтров',
            message: error.message 
        });
    }
});

/**
 * GET /api/filters/popular
 * Получить популярные фильтры
 */
router.get('/popular', async (req, res) => {
    try {
        const { limit = 10, sectionId } = req.query;

        const query = { 
            isPublic: true,
            popularity: { $gt: 0 }
        };

        if (sectionId) {
            query.sectionId = parseInt(sectionId);
        }

        const filters = await Filter.find(query)
            .select('-__v')
            .sort({ popularity: -1, weight: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json(filters);
    } catch (error) {
        console.error('Ошибка при получении популярных фильтров:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении популярных фильтров',
            message: error.message 
        });
    }
});

/**
 * GET /api/filters/types
 * Получить доступные типы фильтров
 */
router.get('/types', async (req, res) => {
    try {
        const { sectionId } = req.query;

        const matchStage = sectionId ? 
            { $match: { sectionId: parseInt(sectionId) } } : 
            { $match: {} };

        const types = await Filter.aggregate([
            matchStage,
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json(types.map(type => ({
            type: type._id,
            count: type.count
        })));
    } catch (error) {
        console.error('Ошибка при получении типов фильтров:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении типов фильтров',
            message: error.message 
        });
    }
});

/**
 * GET /api/filters/sections
 * Получить секции с количеством фильтров
 */
router.get('/sections', async (req, res) => {
    try {
        const sections = await Filter.aggregate([
            { $match: { isPublic: true } },
            { 
                $group: { 
                    _id: '$sectionId', 
                    count: { $sum: 1 },
                    categoryName: { $first: '$categoryName' },
                    categoryUrl: { $first: '$categoryUrl' }
                } 
            },
            { $sort: { count: -1 } }
        ]);

        res.json(sections.map(section => ({
            sectionId: section._id,
            filtersCount: section.count,
            categoryName: section.categoryName,
            categoryUrl: section.categoryUrl
        })));
    } catch (error) {
        console.error('Ошибка при получении секций:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении секций',
            message: error.message 
        });
    }
});

/**
 * GET /api/filters/values/:filterId
 * Получить значения конкретного фильтра
 */
router.get('/values/:filterId', async (req, res) => {
    try {
        const { filterId } = req.params;
        const { search, limit, offset = 0, sortBy = 'popularity' } = req.query;

        const filter = await Filter.findById(filterId)
            .select('values topValues')
            .lean();

        if (!filter) {
            return res.status(404).json({ 
                error: 'Фильтр не найден',
                filterId 
            });
        }

        let values = [...filter.values];
        
        // Добавляем топ значения
        if (filter.topValues && filter.topValues.length > 0) {
            filter.topValues.forEach(topValue => {
                if (!values.find(value => value._id === topValue._id)) {
                    values.unshift(topValue);
                }
            });
        }

        // Фильтрация по поиску
        if (search && search.trim().length > 0) {
            const searchLower = search.toLowerCase();
            values = values.filter(value => 
                value.title.toLowerCase().includes(searchLower) ||
                (value.alias && value.alias.toLowerCase().includes(searchLower))
            );
        }

        // Сортировка
        if (sortBy === 'popularity') {
            values.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        } else if (sortBy === 'count') {
            values.sort((a, b) => (b.productsCount || 0) - (a.productsCount || 0));
        } else if (sortBy === 'title') {
            values.sort((a, b) => a.title.localeCompare(b.title));
        }

        // Пагинация
        const total = values.length;
        const startIndex = parseInt(offset);
        const endIndex = limit ? startIndex + parseInt(limit) : values.length;
        values = values.slice(startIndex, endIndex);

        res.json({
            values,
            pagination: {
                total,
                limit: limit ? parseInt(limit) : values.length,
                offset: startIndex
            }
        });
    } catch (error) {
        console.error('Ошибка при получении значений фильтра:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении значений фильтра',
            message: error.message 
        });
    }
});

/**
 * POST /api/filters/batch
 * Получить несколько фильтров по списку ID
 */
router.post('/batch', async (req, res) => {
    try {
        const { filterIds } = req.body;

        if (!Array.isArray(filterIds) || filterIds.length === 0) {
            return res.status(400).json({ 
                error: 'Требуется массив ID фильтров' 
            });
        }

        if (filterIds.length > 50) {
            return res.status(400).json({ 
                error: 'Максимальное количество фильтров за запрос: 50' 
            });
        }

        const filters = await Filter.find({ 
            _id: { $in: filterIds } 
        })
        .select('-__v')
        .lean();

        res.json(filters);
    } catch (error) {
        console.error('Ошибка при получении фильтров по списку:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении фильтров',
            message: error.message 
        });
    }
});

/**
 * GET /api/filters/stats
 * Получить статистику по фильтрам
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await Filter.aggregate([
            {
                $group: {
                    _id: null,
                    totalFilters: { $sum: 1 },
                    publicFilters: { 
                        $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] } 
                    },
                    averageValuesPerFilter: { 
                        $avg: { $size: '$values' } 
                    },
                    filtersByType: {
                        $push: {
                            type: '$type',
                            count: 1
                        }
                    }
                }
            }
        ]);

        const typeStats = await Filter.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const sectionStats = await Filter.aggregate([
            { $group: { _id: '$sectionId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            general: stats[0] || {
                totalFilters: 0,
                publicFilters: 0,
                averageValuesPerFilter: 0
            },
            byType: typeStats,
            topSections: sectionStats
        });
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера при получении статистики',
            message: error.message 
        });
    }
});

module.exports = router;