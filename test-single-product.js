const mongoose = require('mongoose');
const Product = require('./models/Product.js');
require('dotenv').config();

async function testSingleProduct() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Подключение к MongoDB установлено');

        // Получаем один продукт для тестирования
        const product = await Product.findOne({
            'section._id': { $exists: true },
            productValues: { $exists: true }
        }).select('section productValues').lean();

        if (!product) {
            console.log('❌ Продукт не найден');
            return;
        }

        console.log('📝 Тестовый продукт:');
        console.log('section._id:', product.section._id);
        console.log('productValues keys:', Object.keys(product.productValues));

        // Тестируем извлечение фильтров
        const filters = new Map();

        Object.keys(product.productValues).forEach(key => {
            const value = product.productValues[key];
            console.log(`\n🔍 Обрабатываем ключ: ${key}`);
            console.log('Значение:', {
                type: typeof value,
                hasEdges: !!value.edges,
                edgesLength: value.edges?.length || 0
            });
            
            if (value && value.edges && Array.isArray(value.edges)) {
                console.log(`📋 Найдено ${value.edges.length} edges`);
                
                value.edges.forEach((edge, index) => {
                    if (edge && edge.node) {
                        const { title, value: nodeValue } = edge.node;
                        console.log(`  ${index + 1}. title: "${title}", value: "${nodeValue}"`);
                        
                        if (title && nodeValue) {
                            if (filters.has(title)) {
                                const existingFilter = filters.get(title);
                                if (!existingFilter.values.includes(nodeValue)) {
                                    existingFilter.values.push(nodeValue);
                                }
                            } else {
                                filters.set(title, {
                                    title: title,
                                    values: [nodeValue]
                                });
                            }
                        }
                    }
                });
            }
        });

        console.log('\n✅ Результат обработки:');
        console.log('Найдено фильтров:', filters.size);
        
        filters.forEach((filter, title) => {
            console.log(`\n🎯 Фильтр: ${title}`);
            console.log('Значения:', filter.values);
        });

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Отключение от MongoDB выполнено');
    }
}

testSingleProduct().catch(console.error); 