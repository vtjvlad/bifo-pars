const mongoose = require('mongoose');
const fs = require('fs');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

// Подключение к MongoDB
mongoose.connect(MONGO_URI);

// Определение схемы для товара
const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  hlSectionId: { type: Number, required: true },
  guide: { type: Object, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  vendor: { type: Object, required: true },
  section: { type: Object, required: true },
  isPromo: { type: Boolean, default: false },
  toOfficial: { type: Boolean, default: false },
  promoBid: { type: mongoose.Schema.Types.Mixed, default: null },
  lineName: { type: String },
  linePathNew: { type: String },
  imagesCount: { type: Number, default: 0 },
  videosCount: { type: Number, default: 0 },
  techShortSpecifications: [{ type: String }],
  techShortSpecificationsList: [Object],
  sizesProduct: [Object],
  productValues: [Object],
  fullDescription: { type: String, required: false },
  reviewsCount: { type: Number, default: 0 },
  questionsCount: { type: Number, default: 0 },
  url: { type: String, required: true },
  imageLinks: [Object],
  videos: [Object],
  videoInstagramHash: { type: String, required: false },
  minPrice: { type: Number, required: false },
  maxPrice: { type: Number, required: false },
  currentPrice: { type: Number, required: true },
  initPrice: { type: Number, required: true },
  lastHistoryCurrency: { type: String, default: 'UAH' },
  lastHistoryPrice: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  isNew: { type: Number, default: 0 },
  colorsProduct: [Object],
  crossSelling: [Object],
  similarProducts: [Object],
  newProducts: [Object],
  offerCount: { type: Number, default: 0 },
  offers: { type: Object, required: false },
  // singleOffer: { type: mongoose.Schema.Types.Mixed, default: null },
  madeInUkraine: { type: Boolean, default: false },
  userSubscribed: { type: Boolean, default: false },
  __typename: { type: String, default: 'Product' },
  promoRelinkList: [Object],
}, {
  timestamps: true, // Добавляет поля createdAt и updatedAt
  collection: 'products' // Указывает имя коллекции в MongoDB
});

// Добавление индексов для оптимизации запросов
productSchema.index({ id: 1 }, { unique: true }); // Уникальный индекс по id
productSchema.index({ hlSectionId: 1 }); // Индекс по разделу
productSchema.index({ title: 'text' }); // Текстовый индекс для поиска по названию
productSchema.index({ currentPrice: 1 }); // Индекс по текущей цене
productSchema.index({ isPromo: 1 }); // Индекс по промо-товарам
productSchema.index({ isNew: 1 }); // Индекс по новым товарам
productSchema.index({ madeInUkraine: 1 }); // Индекс по товарам из Украины
productSchema.index({ createdAt: -1 }); // Индекс по дате создания (для сортировки)
productSchema.index({ updatedAt: -1 }); // Индекс по дате обновления
productSchema.index({ salesCount: -1 }); // Индекс по количеству продаж
productSchema.index({ reviewsCount: -1 }); // Индекс по количеству отзывов

// Составные индексы для сложных запросов
productSchema.index({ hlSectionId: 1, currentPrice: 1 }); // Раздел + цена
productSchema.index({ isPromo: 1, currentPrice: 1 }); // Промо + цена
productSchema.index({ isNew: 1, createdAt: -1 }); // Новые товары + дата создания
productSchema.index({ madeInUkraine: 1, currentPrice: 1 }); // Украинские товары + цена

// Индекс для поиска по диапазону цен
productSchema.index({ minPrice: 1, maxPrice: 1 });

// Индекс для поиска по вендору
productSchema.index({ 'vendor.id': 1 });

// Индекс для поиска по секции
productSchema.index({ 'section.id': 1 });

// Создание модели на основе схемы
const Products = mongoose.model('Products', productSchema);

// Чтение JSON-файла
const jsonFilePath = './test_struct-4-3.json'; 
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

// Функция для сохранения данных в MongoDB
async function saveToMongo() {
    try {
        // Вставка данных в базу данных
        const result = await Products.insertMany(jsonData);
        console.log(`Успешно добавлено документов: ${result.length}`);
    } catch (error) {
        console.error('Ошибка при сохранении в MongoDB:', error.message);
    } finally {
        // Закрытие подключения
        mongoose.connection.close();
        console.log('Соединение с MongoDB закрыто.');
    }
}

// Запуск функции сохранения
saveToMongo();
