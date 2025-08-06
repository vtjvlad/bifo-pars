const mongoose = require('mongoose');
const Product = require('./models/Product.js');
require('dotenv').config();

async function debugProducts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Подключение к MongoDB установлено');

        // Проверяем общее количество продуктов
        const totalCount = await Product.countDocuments();
        console.log('📊 Всего продуктов в базе:', totalCount);

        if (totalCount === 0) {
            console.log('❌ В базе нет продуктов!');
            return;
        }

        // Получаем пример продукта для анализа структуры
        const sampleProduct = await Product.findOne().lean();
        console.log('\n📝 Структура продукта (все поля):');
        console.log('Ключи продукта:', Object.keys(sampleProduct));

        // Проверяем, есть ли поле section
        if (sampleProduct.section) {
            console.log('\n📋 Поле section:', {
                _id: sampleProduct.section._id,
                productCategoryName: sampleProduct.section.productCategoryName,
                path: sampleProduct.section.path
            });
        }

        // Проверяем, есть ли поле hlSectionId
        console.log('\n📋 Поле hlSectionId:', sampleProduct.hlSectionId);

        // Проверяем, есть ли поле productValues
        console.log('\n📋 Поле productValues:', {
            exists: !!sampleProduct.productValues,
            type: typeof sampleProduct.productValues,
            keys: sampleProduct.productValues ? Object.keys(sampleProduct.productValues) : null
        });

        if (sampleProduct.productValues) {
            console.log('productValues структура:', {
                keys: Object.keys(sampleProduct.productValues),
                firstKey: Object.keys(sampleProduct.productValues)[0],
                firstValue: sampleProduct.productValues[Object.keys(sampleProduct.productValues)[0]]
            });

            // Проверяем первый элемент productValues
            const firstKey = Object.keys(sampleProduct.productValues)[0];
            const firstValue = sampleProduct.productValues[firstKey];
            
            console.log('\n📋 Первый элемент productValues:');
            console.log('Ключ:', firstKey);
            console.log('Значение:', {
                type: typeof firstValue,
                keys: firstValue ? Object.keys(firstValue) : null,
                hasNode: !!firstValue?.node,
                nodeKeys: firstValue?.node ? Object.keys(firstValue.node) : null
            });

            if (firstValue && firstValue.node) {
                console.log('node.title:', firstValue.node.title);
                console.log('node.value:', firstValue.node.value);
            }

            // Проверяем все элементы productValues
            console.log('\n📋 Все элементы productValues:');
            Object.keys(sampleProduct.productValues).forEach((key, index) => {
                const value = sampleProduct.productValues[key];
                console.log(`  ${index + 1}. Ключ: ${key}, title: ${value?.node?.title}, value: ${value?.node?.value}`);
            });
        }

        // Проверяем продукты с section._id
        const withSectionId = await Product.countDocuments({
            'section._id': { $exists: true }
        });
        console.log('\n📋 Продуктов с section._id:', withSectionId);

        // Проверяем продукты с productValues
        const withProductValues = await Product.countDocuments({
            productValues: { $exists: true }
        });
        console.log('📋 Продуктов с productValues:', withProductValues);

        // Получаем уникальные section._id
        const uniqueSectionIds = await Product.distinct('section._id');
        console.log('\n📋 Уникальные section._id:', uniqueSectionIds);

        // Проверяем продукты с обоими полями
        const withBoth = await Product.countDocuments({
            'section._id': { $exists: true },
            productValues: { $exists: true }
        });
        console.log('📋 Продуктов с section._id и productValues:', withBoth);

        if (withBoth > 0) {
            // Получаем пример продукта с правильными полями
            const goodProduct = await Product.findOne({
                'section._id': { $exists: true },
                productValues: { $exists: true }
            }).select('section productValues hlSectionId').lean();

            console.log('\n✅ Пример продукта с правильными полями:');
            console.log('section._id:', goodProduct.section._id);
            console.log('hlSectionId:', goodProduct.hlSectionId);
            console.log('productValues keys:', Object.keys(goodProduct.productValues));
            
            // Показываем все элементы productValues
            Object.keys(goodProduct.productValues).forEach((key, index) => {
                const value = goodProduct.productValues[key];
                console.log(`  ${index + 1}. ${value?.node?.title}: ${value?.node?.value}`);
            });
        }

    } catch (error) {
        console.error('❌ Ошибка при диагностике:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Отключение от MongoDB выполнено');
    }
}

debugProducts().catch(console.error); 