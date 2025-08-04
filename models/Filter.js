const mongoose = require('mongoose');

// Схема для значений фильтра
const filterValueSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    isNoFollow: { type: Boolean, default: false },
    title: { type: String, required: true },
    alias: { type: String },
    description: { type: String },
    weight: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    productsCount: { type: Number, default: 0 },
    totalProductsCount: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },
    groupId: { type: String },
    groupTitle: { type: String },
    __typename: { type: String, default: 'FilterValue' }
}, { _id: false });

// Схема для групп значений
const filterValueGroupSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    title: { type: String, required: true },
    values: [filterValueSchema],
    __typename: { type: String, default: 'FilterValueGroup' }
}, { _id: false });

// Основная схема фильтра
const filterSchema = new mongoose.Schema({
    _id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, required: true }, // checkbox, range, select, etc.
    weight: { type: Number, default: 0 },
    values: [filterValueSchema],
    topValues: [filterValueSchema],
    valueGroups: [filterValueGroupSchema],
    popularity: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    isWrappable: { type: Boolean, default: false },
    isExcludable: { type: Boolean, default: false },
    useValuesSearch: { type: Boolean, default: false },
    sectionId: { type: Number, required: true }, // ID категории
    categoryUrl: { type: String }, // URL категории
    categoryName: { type: String }, // Название категории
    __typename: { type: String, default: 'Filter' }
}, {
    timestamps: true, // Добавляет поля createdAt и updatedAt
    collection: 'filters' // Указывает имя коллекции в MongoDB
});

// Индексы для оптимизации запросов
filterSchema.index({ sectionId: 1 });
filterSchema.index({ categoryUrl: 1 });
filterSchema.index({ type: 1 });
filterSchema.index({ title: 'text' });
filterSchema.index({ 'values.title': 'text' });

module.exports = mongoose.model('Filter', filterSchema); 