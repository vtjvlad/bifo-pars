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
    _id,
    hlSectionId,
    title,
    date,
    vendor = {},
    section = {},
    isPromo,
    toOfficial,
    lineName,
    linePathNew,
    guide,
    imagesCount,
    videosCount,
    techShortSpecifications,
    techShortSpecificationsList,
    productValues,
    fullDescription,
    sizesProduct,
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
    salesCount,
    isNew,
    // colorsProduct,
    colorsProduct = [],
    crossSelling,
    similarProducts,
    newProducts,
    offerCount,
    offers = {},
    madeInUkraine,
    userSubscribed,
    promoRelinkList
    } = product;

    const { title: vendorTitle, path: vendorPath } = vendor;
    const { productCategoryName, _id: sectionId, path: sectionPath, isAdult} = section;
    const aurl = url.split('/')[1];
    const subCategory = linePathNew?.split('/')[1] || aurl.split('-')[0];
    const category = url.split('/')[1];
    // Структура offers: { totalCount: Number, edges: [ { node: { id, price }, __typename } ] }
    let fourthPrice = null;
    let fifthPrice = null;

    const prices = offers.edges.map(edge => edge.node.price);

    if (prices && Array.isArray(prices)) {
        fourthPrice = prices[3] ?? null;
        fifthPrice = prices[4] ?? null;
    }
    // if (offers && Array.isArray(offers.edges)) {
    //     totalCount = offers.totalCount ?? null;
    //     // Собираем массив node-объектов
    //     const nodes = offers.edges.map(e => e.node).filter(Boolean);
    //     // Сортируем по цене (price)
    //     nodes.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    //     // Получаем цены на 4-й и 5-й позиции (индексация с 0)
    //     fourthPrice = nodes[3]?.price ?? null;
    //     fifthPrice = nodes[4]?.price ?? null;
    // }
    let imageLinksArray = [];
    if (Array.isArray(imageLinks)) {
        imageLinksArray = imageLinks.map(image => {
            if (image) {
                const { thumb, basic, small, big } = image;
                return {
                    thumb: `https://hotline.ua${thumb}`,
                    basic: `https://hotline.ua${basic}`,
                    small: `https://hotline.ua${small}`,
                    big: `https://hotline.ua${big}`
                };
            }
        });
    } else if (imageLinks && typeof imageLinks === 'object') {
        const { thumb, basic, small, big } = imageLinks;
        imageLinksArray = [{
            thumb: `https://hotline.ua${thumb}`,
            basic: `https://hotline.ua${basic}`,
            small: `https://hotline.ua${small}`,
            big: `https://hotline.ua${big}`
        }];
    }

        // bcghfdbnm ye;yj (переписать проще)
        let processedColorsProduct = [];

        if (Array.isArray(colorsProduct)) {
            processedColorsProduct = colorsProduct.map(color => {
                if (color && typeof color === 'object' && color.pathImgBig) {
                    return {
                        ...color,
                        pathImgBig: `https://hotline.ua${color.pathImgBig}`
                    };
                }
                return color;
            });
        } else if (colorsProduct && typeof colorsProduct === 'object') {
            processedColorsProduct = [{
                ...colorsProduct,
                ...(colorsProduct.pathImgBig && {
                    pathImgBig: `https://hotline.ua${colorsProduct.pathImgBig}`
                })
            }];
        }
    // Обработка свойств, которые могут быть массивами или объектами
        // Если свойство является массивом, то преобразуем его в массив объектов
        // Если свойство является объектом, то преобразуем его в массив с одним объектом
        // Если свойство не является ни массивом, ни объектом, то оставляем его как есть

        return {
            id: _id,
            hlSectionId,
            guide,
            title,
            date,
            vendor: { title: vendorTitle, path: vendorPath },
            section: { productCategoryName, _id: sectionId, subCategory, category, path: sectionPath, isAdult },
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
            imageLinks: imageLinksArray,
            videos,
            videoInstagramHash,
            minPrice,
            maxPrice,
            lastHystoryPrice,
            lastHistoryCurrency,
            currentPrice: fourthPrice ?? Math.round((minPrice + maxPrice) / 2),
            initPrice: fifthPrice ?? Math.round((minPrice + maxPrice) / 2),
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
                    pathImg: color.pathImg || null,
                    pathImgBig: color.pathImgBig ? color.pathImgBig : null,
                    pathImgSmall: color.pathImgSmall || null,
                }))
                : [],
            crossSelling,
            similarProducts,
            newProducts,
            prcCount: offerCount,
            prcArray: prices,
            offers:[],
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
const outputFile = testMode ? `./test_struct_${documentsCount}_${orderType}.json` : './test_struct.json';

// Сохраняем результат в новый файл
fs.writeFileSync(outputFile, JSON.stringify(processedProducts, null, 2));
console.log(`Обработанные данные сохранены в ${outputFile}`);
