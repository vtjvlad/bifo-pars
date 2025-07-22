# BIFO - Интернет-магазин

Огромный ассортимент товаров от военного снаряжения до интимных игрушек. У нас есть абсолютно все!

## 🚀 Технологии

### Backend
- **Node.js** - среда выполнения
- **Express.js** - веб-фреймворк
- **MongoDB** - база данных
- **Mongoose** - ODM для MongoDB
- **JWT** - аутентификация
- **bcryptjs** - хеширование паролей

### Frontend
- **HTML5** - разметка
- **CSS3** - стили
- **JavaScript (ES6+)** - логика
- **Bootstrap 5** - UI компоненты
- **Font Awesome** - иконки

## 📋 Функциональность

### Для пользователей
- ✅ Регистрация и авторизация
- ✅ Просмотр категорий товаров
- ✅ Поиск товаров
- ✅ Фильтрация по цене, бренду, категории
- ✅ Добавление товаров в корзину
- ✅ Оформление заказов
- ✅ Просмотр истории заказов
- ✅ Отзывы и рейтинги
- ✅ Избранные товары

### Категории товаров
- 📱 Электроника
- 👕 Одежда
- 🪑 Мебель
- ⚽ Спорт
- 📚 Книги
- 🧸 Игрушки
- 🚗 Автотовары
- 💄 Красота
- 💊 Здоровье
- 🏠 Дом
- 🌱 Сад
- 🔧 Инструменты
- 💍 Украшения
- ⌚ Часы
- 👜 Сумки
- 👟 Обувь
- 🕶️ Аксессуары
- 🍎 Продукты
- 🥤 Напитки
- 🐕 Товары для животных
- 👶 Детские товары
- 📁 Офис
- 🎨 Искусство
- 🏆 Коллекционные
- 🎖️ Военное снаряжение
- 🔞 Интимные товары
- 🎵 Музыка
- 🎬 Фильмы
- 🎮 Игры
- 🏕️ Активный отдых
- 💪 Фитнес
- 🏥 Медицинские товары
- 🏭 Промышленные товары
- 🚜 Сельхозтовары
- 🏗️ Строительные материалы

## 🛠️ Установка

### Предварительные требования
- Node.js (версия 14 или выше)
- MongoDB (локально или облачно)
- npm или yarn

### Шаги установки

1. **Клонируйте репозиторий**
   ```bash
   git clone https://github.com/your-username/bifo.git
   cd bifo
   ```

2. **Установите зависимости**
   ```bash
   npm install
   ```

3. **Создайте файл .env**
   ```bash
   cp .env.example .env
   ```
   
   Или создайте файл `.env` вручную:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/bifo
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Запустите MongoDB**
   ```bash
   # Локально
   mongod
   
   # Или используйте MongoDB Atlas (облачная версия)
   ```

5. **Запустите сервер**
   ```bash
   # Режим разработки
   npm run dev
   
   # Продакшн режим
   npm start
   ```

6. **Откройте браузер**
   ```
   http://localhost:3000
   ```

## 📁 Структура проекта

```
bifo/
├── models/                 # Модели MongoDB
│   ├── Product.js         # Модель товара
│   ├── User.js           # Модель пользователя
│   └── Order.js          # Модель заказа
├── routes/                # API маршруты
│   ├── products.js       # Маршруты товаров
│   ├── auth.js           # Маршруты аутентификации
│   ├── cart.js           # Маршруты корзины
│   ├── orders.js         # Маршруты заказов
│   └── categories.js     # Маршруты категорий
├── public/                # Статические файлы
│   ├── css/
│   │   └── style.css     # Стили
│   ├── js/
│   │   └── app.js        # JavaScript логика
│   ├── images/
│   │   └── bifo-logo.png # Логотип
│   └── index.html        # Главная страница
├── server.js             # Основной сервер
├── package.json          # Зависимости
└── README.md            # Документация
```

## 🔧 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/profile` - Профиль пользователя
- `PUT /api/auth/profile` - Обновление профиля

### Товары
- `GET /api/products` - Список товаров с фильтрацией
- `GET /api/products/:id` - Детали товара
- `GET /api/products/category/:category` - Товары по категории
- `GET /api/products/featured/all` - Рекомендуемые товары
- `GET /api/products/sale/all` - Товары со скидкой
- `GET /api/products/search/:query` - Поиск товаров

### Корзина
- `GET /api/cart` - Получить корзину
- `POST /api/cart/add` - Добавить товар
- `PUT /api/cart/update/:productId` - Обновить количество
- `DELETE /api/cart/remove/:productId` - Удалить товар
- `DELETE /api/cart/clear` - Очистить корзину

### Заказы
- `POST /api/orders` - Создать заказ
- `GET /api/orders` - Список заказов
- `GET /api/orders/:id` - Детали заказа
- `PUT /api/orders/:id/cancel` - Отменить заказ

### Категории
- `GET /api/categories` - Список категорий
- `GET /api/categories/:category/subcategories` - Подкатегории
- `GET /api/categories/:category/brands` - Бренды категории
- `GET /api/categories/:category/price-range` - Диапазон цен

## 🎨 Особенности дизайна

- **Адаптивный дизайн** - работает на всех устройствах
- **Современный UI** - Bootstrap 5 + кастомные стили
- **Анимации** - плавные переходы и эффекты
- **Темная тема** - для навигации
- **Иконки** - Font Awesome для лучшего UX

## 🔒 Безопасность

- **JWT токены** для аутентификации
- **Хеширование паролей** с bcryptjs
- **Валидация данных** на сервере
- **CORS** настройки
- **Защита от XSS** и CSRF атак

## 🚀 Развертывание

### Heroku
```bash
heroku create bifo-app
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
git push heroku main
```

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker build -t bifo .
docker run -p 3000:3000 bifo
```

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📝 Лицензия

MIT License - см. файл LICENSE для деталей.

## 📞 Контакты

- **Email**: info@bifo.ru
- **Телефон**: +7 (999) 123-45-67
- **Адрес**: Москва, Россия

## 🙏 Благодарности

- Bootstrap за отличный UI фреймворк
- Font Awesome за иконки
- MongoDB за базу данных
- Express.js за веб-фреймворк

---

**BIFO** - Ваш надежный партнер в покупках! 🛒✨ 