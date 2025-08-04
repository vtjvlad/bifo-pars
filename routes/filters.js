const express = require('express');
const router = express.Router();
const Filter = require('../models/Filter.js');

// GET /api/filters - Получить все фильтры
router.get('/', async (req, res) => {
    try {
        const { 
            sectionId, 
            categoryUrl, 
            type, 
            search, 
            limit = 50, 
            page = 1 
        } = req.query;

        // Строим фильтр запроса
        const filterQuery = {};
        
        if (sectionId) {
            filterQuery.sectionId = parseInt(sectionId);
        }
        
        if (categoryUrl) {
            filterQuery.categoryUrl = categoryUrl;
        }
        
        if (type) {
            filterQuery.type = type;
        }
        
        if (search) {
            filterQuery.$text = { $search: search };
        }

        // Выполняем запрос с пагинацией
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const filters = await Filter.find(filterQuery)
            .sort({ weight: -1, title: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Получаем общее количество
        const total = await Filter.countDocuments(filterQuery);

        res.json({
            success: true,
            data: filters,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Ошибка при получении фильтров:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении фильтров'
        });
    }
});

// GET /api/filters/:id - Получить фильтр по ID
router.get('/:id', async (req, res) => {
    try {
        const filter = await Filter.findById(req.params.id);
        
        if (!filter) {
            return res.status(404).json({
                success: false,
                error: 'Фильтр не найден'
            });
        }

        res.json({
            success: true,
            data: filter
        });

    } catch (error) {
        console.error('Ошибка при получении фильтра:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении фильтра'
        });
    }
});

// GET /api/filters/section/:sectionId - Получить фильтры по section ID
router.get('/section/:sectionId', async (req, res) => {
    try {
        const sectionId = parseInt(req.params.sectionId);
        
        const filters = await Filter.find({ sectionId })
            .sort({ weight: -1, title: 1 });

        res.json({
            success: true,
            data: filters,
            count: filters.length
        });

    } catch (error) {
        console.error('Ошибка при получении фильтров категории:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении фильтров категории'
        });
    }
});

// GET /api/filters/category/:categoryName - Получить фильтры по названию категории
router.get('/category/:categoryName', async (req, res) => {
    try {
        const categoryName = req.params.categoryName;
        
        const filters = await Filter.find({ 
            categoryName: { $regex: categoryName, $options: 'i' }
        }).sort({ weight: -1, title: 1 });

        res.json({
            success: true,
            data: filters,
            count: filters.length
        });

    } catch (error) {
        console.error('Ошибка при получении фильтров категории:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении фильтров категории'
        });
    }
});

// GET /api/filters/types - Получить все типы фильтров
router.get('/types', async (req, res) => {
    try {
        const types = await Filter.distinct('type');
        
        res.json({
            success: true,
            data: types
        });

    } catch (error) {
        console.error('Ошибка при получении типов фильтров:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении типов фильтров'
        });
    }
});

// GET /api/filters/sections - Получить все section ID
router.get('/sections', async (req, res) => {
    try {
        const sections = await Filter.aggregate([
            {
                $group: {
                    _id: '$sectionId',
                    categoryName: { $first: '$categoryName' },
                    categoryUrl: { $first: '$categoryUrl' },
                    filterCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: sections
        });

    } catch (error) {
        console.error('Ошибка при получении section ID:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении section ID'
        });
    }
});

// GET /api/filters/stats - Получить статистику фильтров
router.get('/stats', async (req, res) => {
    try {
        const totalFilters = await Filter.countDocuments();
        const uniqueCategories = await Filter.distinct('sectionId');
        const filterTypes = await Filter.distinct('type');
        
        // Статистика по категориям
        const categoryStats = await Filter.aggregate([
            {
                $group: {
                    _id: '$sectionId',
                    categoryName: { $first: '$categoryName' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Статистика по типам
        const typeStats = await Filter.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalFilters,
                uniqueCategories: uniqueCategories.length,
                filterTypes,
                categoryStats,
                typeStats
            }
        });

    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении статистики'
        });
    }
});

// POST /api/filters - Создать новый фильтр
router.post('/', async (req, res) => {
    try {
        const filterData = req.body;
        
        // Проверяем, существует ли уже фильтр с таким ID
        const existingFilter = await Filter.findById(filterData._id);
        
        if (existingFilter) {
            return res.status(400).json({
                success: false,
                error: 'Фильтр с таким ID уже существует'
            });
        }

        const newFilter = new Filter(filterData);
        await newFilter.save();

        res.status(201).json({
            success: true,
            data: newFilter
        });

    } catch (error) {
        console.error('Ошибка при создании фильтра:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании фильтра'
        });
    }
});

// PUT /api/filters/:id - Обновить фильтр
router.put('/:id', async (req, res) => {
    try {
        const updatedFilter = await Filter.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedFilter) {
            return res.status(404).json({
                success: false,
                error: 'Фильтр не найден'
            });
        }

        res.json({
            success: true,
            data: updatedFilter
        });

    } catch (error) {
        console.error('Ошибка при обновлении фильтра:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении фильтра'
        });
    }
});

// DELETE /api/filters/:id - Удалить фильтр
router.delete('/:id', async (req, res) => {
    try {
        const deletedFilter = await Filter.findByIdAndDelete(req.params.id);

        if (!deletedFilter) {
            return res.status(404).json({
                success: false,
                error: 'Фильтр не найден'
            });
        }

        res.json({
            success: true,
            message: 'Фильтр успешно удален'
        });

    } catch (error) {
        console.error('Ошибка при удалении фильтра:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении фильтра'
        });
    }
});

module.exports = router; 