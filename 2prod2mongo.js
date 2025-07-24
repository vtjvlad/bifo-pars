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
  seo: [Object],
  promoRelinkList: [Object],
}, {
  timestamps: true, // Добавляет поля createdAt и updatedAt
  collection: 'products' // Указывает имя коллекции в MongoDB
});

// Создание модели на основе схемы
const Products = mongoose.model('Products', productSchema);

// Чтение JSON-файла
const jsonFilePath = './test_struct.json'; 
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