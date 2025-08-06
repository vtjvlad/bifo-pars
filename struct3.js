const fs = require('fs');

// Получаем аргументы командной строки
const inputFile = process.argv[2];
const testMode = process.argv[3] === '--test';
const documentsCount = testMode ? parseInt(process.argv[4]) : null;
const orderType = testMode ? process.argv[5] : null; // 'random' или 'sequential'

// Проверяем, что файл указан
if (!inputFile) {
    console.error('Ошибка: Не указан входной файл');
    console.log('Использование:');
    console.log('  Полная обработка: node struct.js <входной_файл>');
    console.log('  Тестовый режим: node struct.js <входной_файл> --test <количество_документов> <тип_порядка>');
    console.log('');
    console.log('Примеры:');
    console.log('  node struct.js ./hotline-analnye-shariki.json');
    console.log('  node struct.js ./hotline-analnye-shariki.json --test 10 random');
    console.log('  node struct.js ./hotline-analnye-shariki.json --test 5 sequential');
    process.exit(1);
}

// Проверяем, что файл существует
if (!fs.existsSync(inputFile)) {
    console.error(`Ошибка: Файл "${inputFile}" не найден`);
    process.exit(1);
}

// Проверяем аргументы тестового режима
if (testMode) {
    if (!documentsCount || isNaN(documentsCount) || documentsCount <= 0) {
        console.error('Ошибка: Укажите корректное количество документов для обработки');
        process.exit(1);
    }
    
    if (!orderType || !['random', 'sequential'].includes(orderType)) {
        console.error('Ошибка: Тип порядка должен быть "random" или "sequential"');
        process.exit(1);
    }
}

// Читаем файл
const rawData1 = fs.readFileSync(inputFile, 'utf8');

const products = JSON.parse(rawData1);

// Функция для выбора документов в тестовом режиме
function selectTestDocuments(products, count, orderType) {
    if (count >= products.length) {
        console.log(`Предупреждение: Запрошено ${count} документов, но в файле только ${products.length}. Обрабатываем все документы.`);
        return products;
    }
    
    if (orderType === 'random') {
        // Создаем копию массива и перемешиваем
        const shuffled = [...products];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    } else {
        // sequential - берем первые count документов
        return products.slice(0, count);
    }
}

// Выбираем документы для обработки
const productsToProcess = testMode ? selectTestDocuments(products, documentsCount, orderType) : products;

console.log(`Обрабатываем ${productsToProcess.length} документов из ${products.length} доступных`);
if (testMode) {
    console.log(`Режим: тестовый, порядок: ${orderType}`);
}

function destructureNestedObjects(products) {
    const destructuredProducts = products.map(product => {
        // Деструктурируем вложенные объекты
        const {
            id,
            hlSectionId,
            guide,
            title,
            date,
            vendor = {},
            section = {},
            isPromo,
            toOfficial,
            lineName,
            linePathNew,
            imagesCount,
            videosCount,
            techShortSpecifications,
            techShortSpecificationsList,
            sizesProduct,
            productValues,
            fullDescription,
            reviewsCount,
            questionsCount,
            url,
            imageLinks = {} || [],
            videos,
            videoInstagramHash,
            minPrice,
            maxPrice,
            lastHystoryPrice,
            lastHistoryCurrency,
            currentPrice,
            initPrice,
            colorsProduct = [],
            salesCount,
            isNew,
            madeInUkraine,
            userSubscribed,
            promoRelinkList = [],
            crossSelling,
            similarProducts,
            newProducts,
            prcCount,
            prcArray,
            offers = [],
        } = product;

        let processedColorsProduct = [];

        if (Array.isArray(colorsProduct)) {
            processedColorsProduct = colorsProduct.map(color => {
                if (color && typeof color === 'object' && color.pathImg) {
                    return {
                        ...color,
                        pathImg: `https://bifo.in.ua${color.pathImg}`,
                        pathImgSmall: `https://bifo.in.ua${color.pathImgSmall}`
                    };
                }
                return color;
            });
        } else if (colorsProduct && typeof colorsProduct === 'object') {
            processedColorsProduct = [{
                ...colorsProduct,
                ...(colorsProduct.pathImg && {
                    pathImg: `https://bifo.in.ua${colorsProduct.pathImg}`,
                    pathImgSmall: `https://bifo.in.ua${colorsProduct.pathImgSmall}`
                })
            }];
        }

        let processedCrossSelling = [];
        if (Array.isArray(crossSelling)) {
            processedCrossSelling = crossSelling.map(item => {
                return {
                    ...item,
                    image: `https://bifo.in.ua${item.image}`
                };
            });
        } else if (crossSelling && typeof crossSelling === 'object') {
            processedCrossSelling = [{
                ...crossSelling,
                image: `https://bifo.in.ua${crossSelling.image}`
            }];
        }

        let processedNewProducts = [];

        if (Array.isArray(newProducts)) {
            processedNewProducts = newProducts.map(item => {
                return {
                    ...item,
                    image: `https://bifo.in.ua${item.image}`
                };
            });
        } else if (newProducts && typeof newProducts === 'object') {
            processedNewProducts = [{
                ...newProducts,
                image: `https://bifo.in.ua${newProducts.image}`
            }];
        }
    
        
        let processedSimilarProductsProducts = [];
        if (Array.isArray(similarProducts.products)) {
            processedSimilarProductsProducts = similarProducts.products.map(item => {
                return {
                    ...item,
                    image: `https://bifo.in.ua${item.image}`
                };
            });
        }

        return {
            id,
            hlSectionId,
            guide,
            title,
            date,
            vendor,
            section,
            isPromo,
            toOfficial,
            lineName,
            linePathNew,
            imagesCount,
            videosCount,
            techShortSpecifications,
            techShortSpecificationsList,
            sizesProduct,
            productValues,
            fullDescription,
            reviewsCount,
            questionsCount,
            url,
            imageLinks,
            videos,
            videoInstagramHash,
            minPrice,
            maxPrice,
            lastHystoryPrice,
            lastHistoryCurrency,
            currentPrice,
            initPrice,
            // currentPrice: Math.round((minPrice + maxPrice) / 2),
            // initPrice: Math.round((minPrice + maxPrice) / 2),
            salesCount,
            isNew,
            colorsProduct: Array.isArray(processedColorsProduct)
                ? processedColorsProduct.map(color => ({
                    id: color.id || null,
                    title: color.title || null,
                    imageId: color.imageId || null,
                    productPath: color.productPath || null,
                    sectionId: color.sectionId || null,
                    colorsId: color.colorsId || null,
                    alias: color.alias || null,
                    colorName: color.colorName || null,
                    sizeId: color.sizeId || null,
                    sizeName: color.sizeName || null,
                    sizeChart: color.sizeChart || null,
                    pathImg: color.pathImg ? color.pathImg : null,
                    pathImgBig: color.pathImgBig || null,
                    pathImgSmall: color.pathImgSmall ? color.pathImgSmall : null,
                }))
                : [],
            crossSelling: Array.isArray(processedCrossSelling)
                ? processedCrossSelling.map(item => ({
                    title: item.title || null,
                    image: item.image || null,
                    path: item.path || null
                }))
                : [],
            similarProducts: {
                products: Array.isArray(processedSimilarProductsProducts)
                    ? processedSimilarProductsProducts.map(item => ({
                        id: item.id || null,
                        title: item.title || null,
                        path: item.path || null,
                        image: item.image ? item.image : null,
                        minPrice: item.minPrice || null,
                        quantity: item.quantity || null,
                        vendor: item.vendor || null,
                        vendorId: item.vendorId || null,
                        sectionId: item.sectionId || null,
                        popularity: item.popularity || null,
                        isNew: item.isNew || null,
                    }))
                    : [],
                filters: Array.isArray(similarProducts.filters)
                    ? similarProducts.filters.map(item => ({
                        filterValueId: item.filterValueId || null,
                        filterValueTitle: item.filterValueTitle || null,
                        filterValueTitleUk: item.filterValueTitleUk || null,
                        filterTitle: item.filterTitle || null,
                        filterTitleUk: item.filterTitleUk || null,
                    }))
                    :   [],
                    priceRange: {
                        from: similarProducts.priceRange.from || null,
                        to: similarProducts.priceRange.to || null
                    }
            },
            newProducts: Array.isArray(processedNewProducts)
                ? processedNewProducts.map(item => ({
                    id: item.id || null,
                    title: item.title || null,
                    path: item.path || null,
                    image: item.image ? item.image : null,
                    minPrice: item.minPrice || null,
                    quantity: item.quantity || null,
                    vendor: item.vendor || null,
                    vendorId: item.vendorId || null,
                    isNew: item.isNew || null
                }))
                : [],
            prcCount,
            prcArray,
            offers,
            madeInUkraine,
            userSubscribed,
            promoRelinkList
        };
    });

    return destructuredProducts;
}

// Выполняем деструктуризацию
const processedProducts = destructureNestedObjects(productsToProcess);

// Определяем имя выходного файла
const outputFile = testMode ? `./test_struct2_${documentsCount}_${orderType}.json` : './test_struct3.json';

// Сохраняем результат в новый файл
fs.writeFileSync(outputFile, JSON.stringify(processedProducts, null, 2));
console.log(`Обработанные данные сохранены в ${outputFile}`);
