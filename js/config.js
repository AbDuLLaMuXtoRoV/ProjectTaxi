/*
 * Safar — site configuration.
 * Shared by the browser (window.SAFAR_CONFIG) and by server.js (require).
 * Contacts, prices, airports and places are all edited here.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SAFAR_CONFIG = factory();
})(this, function () {
  return {
    brand: {
      name: 'Safar',
      // TODO: replace the placeholder contacts below with real ones before launch.
      phone: '+998 71 200 00 00',
      phoneHref: '+998712000000',
      telegram: 'safar_transfer',      // t.me/<username>
      whatsapp: '998712000000',        // wa.me/<number>
      email: 'info@safar.uz',
      siteUrl: 'https://safar.uz'
    },

    // Uzbekistan is UTC+5 all year (no daylight saving).
    utcOffset: '+05:00',
    utcOffsetMin: 300,

    usdRate: 12700,          // so'm per 1 USD — only used for the "≈ $" hint
    freeWaitMin: 60,         // free waiting after landing
    freeWaitPickupMin: 15,   // free waiting at a city pickup
    freeCancelHours: 3,
    asapLeadMin: 30,         // "Right now" — typical arrival time of a driver

    pricing: {
      roundTo: 5000,             // trip prices are rounded up to this step
      longDistanceFromKm: 60,    // kilometres after this are cheaper…
      longDistanceFactor: 0.7,   // …by this factor
      returnDiscount: 0.10,      // discount on the return leg
      minHours: 2,
      maxHours: 12
    },

    // Percent discounts. Validated again on the server.
    promoCodes: { WELCOME10: 0.10 },

    // Prices in so'm. base + perKm × km, never less than min. hour = hourly rate.
    vehicles: [
      { id: 'economy',  body: 'sedan', models: 'Chevrolet Cobalt, Chevrolet Onix',        pax: 4,  bags: 2,  base: 45000,  perKm: 3200,  min: 90000,  hour: 90000 },
      { id: 'comfort',  body: 'sedan', models: 'Chevrolet Malibu, Kia K5, BYD Chazor',     pax: 4,  bags: 3,  base: 70000,  perKm: 4300,  min: 140000, hour: 140000, popular: true },
      { id: 'minivan',  body: 'van',   models: 'Kia Carnival, Hyundai Staria',             pax: 6,  bags: 6,  base: 110000, perKm: 6000,  min: 230000, hour: 220000 },
      { id: 'business', body: 'exec',  models: 'Mercedes-Benz E-Class, BYD Han',           pax: 3,  bags: 3,  base: 180000, perKm: 9000,  min: 380000, hour: 380000 },
      { id: 'premium',  body: 'exec',  models: 'Mercedes-Benz S-Class',                    pax: 3,  bags: 3,  base: 400000, perKm: 16000, min: 850000, hour: 750000 },
      { id: 'minibus',  body: 'bus',   models: 'Mercedes-Benz Sprinter',                   pax: 16, bags: 16, base: 200000, perKm: 9500,  min: 450000, hour: 450000 }
    ],

    airports: [
      { id: 'TAS', lat: 41.2579, lon: 69.2811, city: { en: 'Tashkent', ru: 'Ташкент', uz: 'Toshkent' }, name: { en: 'Tashkent International Airport', ru: 'Международный аэропорт Ташкент', uz: 'Toshkent xalqaro aeroporti' } },
      { id: 'SKD', lat: 39.7005, lon: 66.9838, city: { en: 'Samarkand', ru: 'Самарканд', uz: 'Samarqand' }, name: { en: 'Samarkand International Airport', ru: 'Международный аэропорт Самарканд', uz: 'Samarqand xalqaro aeroporti' } },
      { id: 'BHK', lat: 39.7750, lon: 64.4833, city: { en: 'Bukhara', ru: 'Бухара', uz: 'Buxoro' }, name: { en: 'Bukhara International Airport', ru: 'Международный аэропорт Бухара', uz: 'Buxoro xalqaro aeroporti' } },
      { id: 'UGC', lat: 41.5843, lon: 60.6417, city: { en: 'Urgench · Khiva', ru: 'Ургенч · Хива', uz: 'Urganch · Xiva' }, name: { en: 'Urgench International Airport', ru: 'Международный аэропорт Ургенч', uz: 'Urganch xalqaro aeroporti' } },
      { id: 'FEG', lat: 40.3588, lon: 71.7450, city: { en: 'Fergana', ru: 'Фергана', uz: 'Fargʻona' }, name: { en: 'Fergana International Airport', ru: 'Международный аэропорт Фергана', uz: 'Fargʻona xalqaro aeroporti' } },
      { id: 'NMA', lat: 40.9846, lon: 71.5567, city: { en: 'Namangan', ru: 'Наманган', uz: 'Namangan' }, name: { en: 'Namangan International Airport', ru: 'Международный аэропорт Наманган', uz: 'Namangan xalqaro aeroporti' } },
      { id: 'AZN', lat: 40.7277, lon: 72.2940, city: { en: 'Andijan', ru: 'Андижан', uz: 'Andijon' }, name: { en: 'Andijan International Airport', ru: 'Международный аэропорт Андижан', uz: 'Andijon xalqaro aeroporti' } },
      { id: 'NVI', lat: 40.1172, lon: 65.1708, city: { en: 'Navoi', ru: 'Навои', uz: 'Navoiy' }, name: { en: 'Navoi International Airport', ru: 'Международный аэропорт Навои', uz: 'Navoiy xalqaro aeroporti' } },
      { id: 'KSQ', lat: 38.8336, lon: 65.9215, city: { en: 'Karshi', ru: 'Карши', uz: 'Qarshi' }, name: { en: 'Karshi International Airport', ru: 'Международный аэропорт Карши', uz: 'Qarshi xalqaro aeroporti' } },
      { id: 'TMJ', lat: 37.2867, lon: 67.3100, city: { en: 'Termez', ru: 'Термез', uz: 'Termiz' }, name: { en: 'Termez International Airport', ru: 'Международный аэропорт Термез', uz: 'Termiz xalqaro aeroporti' } },
      { id: 'NCU', lat: 42.4884, lon: 59.6233, city: { en: 'Nukus', ru: 'Нукус', uz: 'Nukus' }, name: { en: 'Nukus International Airport', ru: 'Международный аэропорт Нукус', uz: 'Nukus xalqaro aeroporti' } }
    ],

    // Places offered in the destination search. `top` = shown before the user types (lower = first).
    // `alias` = extra search words. Coordinates are approximate centres.
    places: [
      // Tashkent
      { id: 'tas-center', type: 'center', top: 1, lat: 41.3111, lon: 69.2797, alias: 'amir temur skver markaz center centr', name: { en: 'Tashkent city centre (Amir Temur Square)', ru: 'Центр Ташкента (сквер Амира Темура)', uz: 'Toshkent markazi (Amir Temur xiyoboni)' } },
      { id: 'tashkent-city', type: 'hotel', top: 2, lat: 41.3165, lon: 69.2485, alias: 'hilton tashkent city park', name: { en: 'Tashkent City · Hilton', ru: 'Ташкент Сити · Hilton', uz: 'Tashkent City · Hilton' } },
      { id: 'hyatt', type: 'hotel', top: 3, lat: 41.3160, lon: 69.2745, alias: 'hyatt regency', name: { en: 'Hyatt Regency Tashkent', ru: 'Hyatt Regency Ташкент', uz: 'Hyatt Regency Toshkent' } },
      { id: 'hotel-uzbekistan', type: 'hotel', top: 4, lat: 41.3122, lon: 69.2830, alias: 'uzbekistan hotel gostinitsa', name: { en: 'Hotel Uzbekistan', ru: 'Гостиница «Узбекистан»', uz: '«Oʻzbekiston» mehmonxonasi' } },
      { id: 'tas-rail', type: 'station', top: 5, lat: 41.2928, lon: 69.2870, alias: 'vokzal train poezd afrosiyob', name: { en: 'Tashkent Railway Station (Central)', ru: 'Ж/д вокзал Ташкент (Центральный)', uz: 'Toshkent temir yoʻl vokzali (Markaziy)' } },
      { id: 'tas-rail-south', type: 'station', top: 9, lat: 41.2573, lon: 69.2153, alias: 'vokzal train poezd janubiy yuzhny', name: { en: 'Tashkent South Railway Station', ru: 'Южный вокзал Ташкента', uz: 'Toshkent Janubiy vokzali' } },
      { id: 'chorsu', type: 'landmark', top: 7, lat: 41.3268, lon: 69.2347, alias: 'bazar bozor market', name: { en: 'Chorsu Bazaar', ru: 'Базар Чорсу', uz: 'Chorsu bozori' } },
      { id: 'hazrati-imam', type: 'landmark', top: 8, lat: 41.3384, lon: 69.2404, alias: 'hast imam mosque masjid', name: { en: 'Hazrati Imam Complex', ru: 'Комплекс Хазрати Имам', uz: 'Hazrati Imom majmuasi' } },
      { id: 'chilonzor', type: 'district', lat: 41.2850, lon: 69.2050, alias: 'chilanzar', name: { en: 'Chilanzar district', ru: 'Чиланзарский район', uz: 'Chilonzor tumani' } },
      { id: 'yunusobod', type: 'district', lat: 41.3650, lon: 69.2870, alias: 'yunusabad', name: { en: 'Yunusabad district', ru: 'Юнусабадский район', uz: 'Yunusobod tumani' } },
      { id: 'mirzo-ulugbek', type: 'district', lat: 41.3330, lon: 69.3350, alias: 'ulugbek', name: { en: 'Mirzo-Ulugbek district', ru: 'Мирзо-Улугбекский район', uz: 'Mirzo Ulugʻbek tumani' } },
      { id: 'yakkasaroy', type: 'district', lat: 41.2920, lon: 69.2620, alias: 'yakkasaray', name: { en: 'Yakkasaray district', ru: 'Яккасарайский район', uz: 'Yakkasaroy tumani' } },
      { id: 'mirobod', type: 'district', lat: 41.2960, lon: 69.2850, alias: 'mirabad', name: { en: 'Mirabad district', ru: 'Мирабадский район', uz: 'Mirobod tumani' } },
      { id: 'shayxontohur', type: 'district', lat: 41.3220, lon: 69.2300, alias: 'shaykhantakhur shayhontohur', name: { en: 'Shaykhantakhur district', ru: 'Шайхантахурский район', uz: 'Shayxontohur tumani' } },
      { id: 'olmazor', type: 'district', lat: 41.3520, lon: 69.2150, alias: 'almazar', name: { en: 'Almazar district', ru: 'Алмазарский район', uz: 'Olmazor tumani' } },
      { id: 'uchtepa', type: 'district', lat: 41.2950, lon: 69.1800, alias: 'uchtepa', name: { en: 'Uchtepa district', ru: 'Учтепинский район', uz: 'Uchtepa tumani' } },
      { id: 'sergeli', type: 'district', lat: 41.2250, lon: 69.2200, alias: 'sergeli', name: { en: 'Sergeli district', ru: 'Сергелийский район', uz: 'Sergeli tumani' } },
      { id: 'yashnobod', type: 'district', lat: 41.2950, lon: 69.3450, alias: 'yashnabad', name: { en: 'Yashnabad district', ru: 'Яшнабадский район', uz: 'Yashnobod tumani' } },
      { id: 'bektemir', type: 'district', lat: 41.2090, lon: 69.3350, alias: 'bektemir', name: { en: 'Bektemir district', ru: 'Бектемирский район', uz: 'Bektemir tumani' } },
      { id: 'yangihayot', type: 'district', lat: 41.2050, lon: 69.2400, alias: 'yangihayot', name: { en: 'Yangihayot district', ru: 'Янгихаётский район', uz: 'Yangihayot tumani' } },
      // Mountains and towns around Tashkent
      { id: 'amirsoy', type: 'mountain', top: 6, lat: 41.4930, lon: 69.9580, alias: 'ski kurort resort', name: { en: 'Amirsoy Mountain Resort', ru: 'Горный курорт Amirsoy', uz: 'Amirsoy togʻ kurorti' } },
      { id: 'chimgan', type: 'mountain', top: 10, lat: 41.5480, lon: 70.0150, alias: 'chimyon chimgan', name: { en: 'Chimgan mountains', ru: 'Горы Чимган', uz: 'Chimyon togʻlari' } },
      { id: 'charvak', type: 'mountain', top: 11, lat: 41.6250, lon: 69.9500, alias: 'chorvoq charvak lake', name: { en: 'Charvak reservoir', ru: 'Чарвакское водохранилище', uz: 'Chorvoq suv ombori' } },
      { id: 'chirchiq', type: 'city', lat: 41.4689, lon: 69.5822, alias: 'chirchik', name: { en: 'Chirchiq', ru: 'Чирчик', uz: 'Chirchiq' } },
      { id: 'angren', type: 'city', lat: 41.0167, lon: 70.1436, alias: 'angren', name: { en: 'Angren', ru: 'Ангрен', uz: 'Angren' } },
      { id: 'gulistan', type: 'city', lat: 40.4897, lon: 68.7842, alias: 'guliston', name: { en: 'Gulistan', ru: 'Гулистан', uz: 'Guliston' } },
      { id: 'jizzakh', type: 'city', lat: 40.1158, lon: 67.8422, alias: 'jizzax djizak', name: { en: 'Jizzakh', ru: 'Джизак', uz: 'Jizzax' } },
      // Samarkand
      { id: 'registan', type: 'landmark', top: 1, lat: 39.6547, lon: 66.9757, alias: 'registon', name: { en: 'Registan Square', ru: 'Площадь Регистан', uz: 'Registon maydoni' } },
      { id: 'samarkand-city', type: 'city', top: 2, lat: 39.6542, lon: 66.9597, alias: 'samarqand samarkand', name: { en: 'Samarkand (city centre)', ru: 'Самарканд (центр)', uz: 'Samarqand (markaz)' } },
      { id: 'gur-emir', type: 'landmark', top: 3, lat: 39.6484, lon: 66.9690, alias: 'amir temur maqbara mausoleum', name: { en: 'Gur-e-Amir Mausoleum', ru: 'Мавзолей Гур-Эмир', uz: 'Goʻri Amir maqbarasi' } },
      { id: 'silk-road-skd', type: 'hotel', top: 4, lat: 39.6900, lon: 67.0250, alias: 'eternal city boqiy shahar vechny gorod', name: { en: 'Silk Road Samarkand', ru: 'Silk Road Samarkand', uz: 'Silk Road Samarkand' } },
      { id: 'skd-rail', type: 'station', top: 5, lat: 39.6762, lon: 66.9335, alias: 'vokzal train poezd', name: { en: 'Samarkand Railway Station', ru: 'Ж/д вокзал Самарканд', uz: 'Samarqand temir yoʻl vokzali' } },
      { id: 'shakhrisabz', type: 'city', lat: 39.0577, lon: 66.8340, alias: 'shahrisabz', name: { en: 'Shakhrisabz', ru: 'Шахрисабз', uz: 'Shahrisabz' } },
      // Bukhara
      { id: 'lyabi-hauz', type: 'landmark', top: 1, lat: 39.7740, lon: 64.4210, alias: 'labi hovuz old town eski shahar', name: { en: 'Lyabi-Hauz (Old Town)', ru: 'Ляби-Хауз (Старый город)', uz: 'Labi Hovuz (Eski shahar)' } },
      { id: 'bukhara-city', type: 'city', top: 2, lat: 39.7747, lon: 64.4286, alias: 'buxoro bukhara', name: { en: 'Bukhara (city centre)', ru: 'Бухара (центр)', uz: 'Buxoro (markaz)' } },
      { id: 'bhk-rail', type: 'station', top: 3, lat: 39.7215, lon: 64.5520, alias: 'kogon kagan vokzal train', name: { en: 'Bukhara Railway Station (Kagan)', ru: 'Ж/д вокзал Бухара (Каган)', uz: 'Buxoro temir yoʻl vokzali (Kogon)' } },
      // Khorezm
      { id: 'khiva', type: 'city', top: 1, lat: 41.3783, lon: 60.3639, alias: 'xiva ichan kala ichon qala', name: { en: 'Khiva (Ichan-Kala)', ru: 'Хива (Ичан-Кала)', uz: 'Xiva (Ichan qalʼa)' } },
      { id: 'urgench-city', type: 'city', top: 2, lat: 41.5500, lon: 60.6333, alias: 'urganch', name: { en: 'Urgench (city centre)', ru: 'Ургенч (центр)', uz: 'Urganch (markaz)' } },
      // Other regional centres
      { id: 'fergana-city', type: 'city', top: 1, lat: 40.3864, lon: 71.7864, alias: 'fargona fergana', name: { en: 'Fergana (city centre)', ru: 'Фергана (центр)', uz: 'Fargʻona (markaz)' } },
      { id: 'kokand', type: 'city', lat: 40.5286, lon: 70.9425, alias: 'qoqon kokand', name: { en: 'Kokand', ru: 'Коканд', uz: 'Qoʻqon' } },
      { id: 'namangan-city', type: 'city', top: 1, lat: 40.9983, lon: 71.6726, alias: 'namangan', name: { en: 'Namangan (city centre)', ru: 'Наманган (центр)', uz: 'Namangan (markaz)' } },
      { id: 'andijan-city', type: 'city', top: 1, lat: 40.7821, lon: 72.3442, alias: 'andijon andijan', name: { en: 'Andijan (city centre)', ru: 'Андижан (центр)', uz: 'Andijon (markaz)' } },
      { id: 'navoi-city', type: 'city', top: 1, lat: 40.0844, lon: 65.3792, alias: 'navoiy navoi', name: { en: 'Navoi (city centre)', ru: 'Навои (центр)', uz: 'Navoiy (markaz)' } },
      { id: 'karshi-city', type: 'city', top: 1, lat: 38.8606, lon: 65.7891, alias: 'qarshi karshi', name: { en: 'Karshi (city centre)', ru: 'Карши (центр)', uz: 'Qarshi (markaz)' } },
      { id: 'termez-city', type: 'city', top: 1, lat: 37.2242, lon: 67.2783, alias: 'termiz termez', name: { en: 'Termez (city centre)', ru: 'Термез (центр)', uz: 'Termiz (markaz)' } },
      { id: 'nukus-city', type: 'city', top: 1, lat: 42.4600, lon: 59.6100, alias: 'nukus', name: { en: 'Nukus (city centre)', ru: 'Нукус (центр)', uz: 'Nukus (markaz)' } }
    ],

    popularRoutes: [
      { airport: 'TAS', place: 'tas-center' },
      { airport: 'TAS', place: 'tashkent-city' },
      { airport: 'TAS', place: 'amirsoy' },
      { airport: 'TAS', place: 'samarkand-city' },
      { airport: 'SKD', place: 'registan' },
      { airport: 'BHK', place: 'lyabi-hauz' },
      { airport: 'UGC', place: 'khiva' },
      { airport: 'TAS', place: 'charvak' }
    ],

    // TODO: placeholder reviews — replace with real customer reviews before launch.
    reviews: [
      { name: 'Dilnoza R.', from: 'Toshkent', lang: 'uz', text: 'Onamni Umradan kutib olish uchun buyurtma qildim. Haydovchi yuklarini koʻtarib, uygacha ehtiyotkorlik bilan olib keldi. Katta rahmat!' },
      { name: 'Сергей К.', from: 'Москва', lang: 'ru', text: 'Рейс задержали на два часа, а водитель всё равно ждал с табличкой. Цена такая же, как на сайте, без сюрпризов.' },
      { name: 'Emma L.', from: 'London', lang: 'en', text: 'Landed in Tashkent at 3 am and the driver was right at the exit. Clean car, fixed price and easy card payment.' }
    ]
  };
});
