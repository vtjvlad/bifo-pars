# Быстрый старт: Инициализация фильтров

## Шаг 1: Подготовка

Убедитесь, что у вас установлены все зависимости:
```bash
npm install
```

Проверьте, что файл `.env` содержит правильные настройки MongoDB:
```
MONGO_URI=mongodb://localhost:27017/your_database
```

## Шаг 2: Запуск сервера

Запустите сервер в фоновом режиме:
```bash
node server.js
```

Сервер будет доступен по адресу: http://localhost:3000

## Шаг 3: Инициализация фильтров

Запустите инициализацию фильтров:
```bash
# Обычная инициализация
node init-filters-db.js

# Или с очисткой существующих данных
node init-filters-db.js --clear
```

## Шаг 4: Проверка работы

Проверьте, что фильтры загружены:
```bash
# Показать статистику
node init-filters-db.js --stats

# Или протестировать API
node test-filters-api.js
```

## Шаг 5: Использование API

Теперь вы можете использовать API фильтров:

```bash
# Получить все фильтры
curl http://localhost:3000/api/filters

# Получить фильтры для мобильных телефонов
curl http://localhost:3000/api/filters/section/386

# Получить статистику
curl http://localhost:3000/api/filters/stats
```

## Структура файлов

```
├── models/Filter.js              # Модель MongoDB для фильтров
├── routes/filters.js             # API маршруты для фильтров
├── init-filters-db.js           # Скрипт инициализации
├── test-filters-api.js          # Тестовый скрипт
├── pars/categories-filters.txt   # Файл категорий
├── pars/hotline-filters-parser.js # Парсер фильтров Hotline.ua
└── README-filters-init.md       # Подробная документация
```

## Возможные проблемы

### Ошибка подключения к MongoDB
- Убедитесь, что MongoDB запущен
- Проверьте строку подключения в `.env`

### Ошибки API Hotline.ua
- Проверьте интернет-соединение
- Возможно, нужно обновить токены в `pars/tt.js`

### Пустые результаты
- Проверьте файл `pars/categories-filters.txt`
- Убедитесь, что section ID корректны

## Команды для мониторинга

```bash
# Запуск сервера
node server.js

# Инициализация фильтров
node init-filters-db.js --clear

# Тестирование API
node test-filters-api.js

# Просмотр статистики
node init-filters-db.js --stats
```

## Следующие шаги

1. Настройте дополнительные категории в `pars/categories-filters.txt`
2. Добавьте новые типы фильтров в модель
3. Расширьте API для специфических потребностей
4. Настройте мониторинг и логирование 