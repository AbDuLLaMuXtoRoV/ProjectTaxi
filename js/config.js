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
      // 555-01xx numbers and the .example domain are reserved for fiction, so they never reach a real person.
      phone: '+1 (212) 555-0147',
      phoneHref: '+12125550147',
      sms: '+12125550147',
      whatsapp: '12125550147',          // wa.me/<number>
      email: 'rides@safar.example',
      siteUrl: 'https://safar.example'
    },

    currency: 'USD',
    phonePrefix: '+1',                   // pre-filled in phone fields
    // Where pickups and drop-offs are accepted (continental US, Alaska, Hawaii).
    bounds: { minLat: 18, maxLat: 72, minLon: -170, maxLon: -64 },
    countryCode: 'US',                   // address search is limited to this country

    freeWaitMin: 60,         // free waiting after landing
    freeWaitPickupMin: 15,   // free waiting at a regular pickup
    freeCancelHours: 3,
    asapLeadMin: 45,         // "Right now" — typical arrival time of a chauffeur

    pricing: {
      roundTo: 5,                  // trip prices are rounded up to $5
      longDistanceFromMi: 50,      // miles after this are cheaper…
      longDistanceFactor: 0.75,    // …by this factor
      returnDiscount: 0.10,        // discount on the return leg
      minHours: 2,
      maxHours: 12
    },

    // Percent discounts. Validated again on the server.
    promoCodes: { WELCOME10: 0.10 },

    // All-inclusive prices in US dollars (tolls, taxes, airport fees and gratuity included).
    // base + perMile × miles, never less than min. hour = hourly rate.
    vehicles: [
      { id: 'standard',    models: 'Toyota Camry, Honda Accord',                pax: 3,  bags: 2,  base: 35,  perMile: 3.00, min: 65,  hour: 65 },
      { id: 'business',    models: 'Mercedes-Benz E-Class, Cadillac CT6',       pax: 3,  bags: 3,  base: 50,  perMile: 3.75, min: 95,  hour: 85, popular: true },
      { id: 'suv',         models: 'Chevrolet Suburban, GMC Yukon XL',          pax: 6,  bags: 6,  base: 70,  perMile: 4.50, min: 125, hour: 110 },
      { id: 'first',       models: 'Mercedes-Benz S-Class, BMW 7 Series',       pax: 3,  bags: 3,  base: 85,  perMile: 5.50, min: 150, hour: 130 },
      { id: 'premium-suv', models: 'Cadillac Escalade ESV, Lincoln Navigator L', pax: 6,  bags: 6,  base: 95,  perMile: 5.25, min: 160, hour: 140 },
      { id: 'sprinter',    models: 'Mercedes-Benz Sprinter (executive)',        pax: 14, bags: 14, base: 140, perMile: 6.50, min: 250, hour: 175 }
    ],

    airports: [
      { id: 'JFK', tz: 'America/New_York', lat: 40.6413, lon: -73.7781, city: { en: 'New York', es: 'Nueva York' }, name: { en: 'John F. Kennedy International Airport', es: 'Aeropuerto Internacional John F. Kennedy' } },
      { id: 'LGA', tz: 'America/New_York', lat: 40.7769, lon: -73.8740, city: { en: 'New York', es: 'Nueva York' }, name: { en: 'LaGuardia Airport', es: 'Aeropuerto LaGuardia' } },
      { id: 'EWR', tz: 'America/New_York', lat: 40.6895, lon: -74.1745, city: { en: 'Newark · New York', es: 'Newark · Nueva York' }, name: { en: 'Newark Liberty International Airport', es: 'Aeropuerto Internacional Newark Liberty' } },
      { id: 'BOS', tz: 'America/New_York', lat: 42.3656, lon: -71.0096, city: { en: 'Boston', es: 'Boston' }, name: { en: 'Boston Logan International Airport', es: 'Aeropuerto Internacional Logan de Boston' } },
      { id: 'IAD', tz: 'America/New_York', lat: 38.9531, lon: -77.4565, city: { en: 'Washington, D.C.', es: 'Washington D. C.' }, name: { en: 'Washington Dulles International Airport', es: 'Aeropuerto Internacional Washington Dulles' } },
      { id: 'DCA', tz: 'America/New_York', lat: 38.8512, lon: -77.0402, city: { en: 'Washington, D.C.', es: 'Washington D. C.' }, name: { en: 'Ronald Reagan Washington National Airport', es: 'Aeropuerto Nacional Ronald Reagan de Washington' } },
      { id: 'ATL', tz: 'America/New_York', lat: 33.6407, lon: -84.4277, city: { en: 'Atlanta', es: 'Atlanta' }, name: { en: 'Hartsfield-Jackson Atlanta International Airport', es: 'Aeropuerto Internacional Hartsfield-Jackson de Atlanta' } },
      { id: 'MIA', tz: 'America/New_York', lat: 25.7959, lon: -80.2870, city: { en: 'Miami', es: 'Miami' }, name: { en: 'Miami International Airport', es: 'Aeropuerto Internacional de Miami' } },
      { id: 'FLL', tz: 'America/New_York', lat: 26.0742, lon: -80.1506, city: { en: 'Fort Lauderdale', es: 'Fort Lauderdale' }, name: { en: 'Fort Lauderdale-Hollywood International Airport', es: 'Aeropuerto Internacional Fort Lauderdale-Hollywood' } },
      { id: 'MCO', tz: 'America/New_York', lat: 28.4312, lon: -81.3081, city: { en: 'Orlando', es: 'Orlando' }, name: { en: 'Orlando International Airport', es: 'Aeropuerto Internacional de Orlando' } },
      { id: 'ORD', tz: 'America/Chicago', lat: 41.9742, lon: -87.9073, city: { en: 'Chicago', es: 'Chicago' }, name: { en: 'O\'Hare International Airport', es: 'Aeropuerto Internacional O\'Hare' } },
      { id: 'DFW', tz: 'America/Chicago', lat: 32.8998, lon: -97.0403, city: { en: 'Dallas · Fort Worth', es: 'Dallas · Fort Worth' }, name: { en: 'Dallas Fort Worth International Airport', es: 'Aeropuerto Internacional de Dallas-Fort Worth' } },
      { id: 'IAH', tz: 'America/Chicago', lat: 29.9902, lon: -95.3368, city: { en: 'Houston', es: 'Houston' }, name: { en: 'George Bush Intercontinental Airport', es: 'Aeropuerto Intercontinental George Bush' } },
      { id: 'DEN', tz: 'America/Denver', lat: 39.8561, lon: -104.6737, city: { en: 'Denver', es: 'Denver' }, name: { en: 'Denver International Airport', es: 'Aeropuerto Internacional de Denver' } },
      { id: 'PHX', tz: 'America/Phoenix', lat: 33.4342, lon: -112.0116, city: { en: 'Phoenix', es: 'Phoenix' }, name: { en: 'Phoenix Sky Harbor International Airport', es: 'Aeropuerto Internacional Sky Harbor de Phoenix' } },
      { id: 'LAS', tz: 'America/Los_Angeles', lat: 36.0840, lon: -115.1537, city: { en: 'Las Vegas', es: 'Las Vegas' }, name: { en: 'Harry Reid International Airport', es: 'Aeropuerto Internacional Harry Reid' } },
      { id: 'LAX', tz: 'America/Los_Angeles', lat: 33.9416, lon: -118.4085, city: { en: 'Los Angeles', es: 'Los Ángeles' }, name: { en: 'Los Angeles International Airport', es: 'Aeropuerto Internacional de Los Ángeles' } },
      { id: 'SAN', tz: 'America/Los_Angeles', lat: 32.7338, lon: -117.1933, city: { en: 'San Diego', es: 'San Diego' }, name: { en: 'San Diego International Airport', es: 'Aeropuerto Internacional de San Diego' } },
      { id: 'SFO', tz: 'America/Los_Angeles', lat: 37.6213, lon: -122.3790, city: { en: 'San Francisco', es: 'San Francisco' }, name: { en: 'San Francisco International Airport', es: 'Aeropuerto Internacional de San Francisco' } },
      { id: 'OAK', tz: 'America/Los_Angeles', lat: 37.7126, lon: -122.2197, city: { en: 'Oakland · Bay Area', es: 'Oakland · Bahía de San Francisco' }, name: { en: 'Oakland International Airport', es: 'Aeropuerto Internacional de Oakland' } },
      { id: 'SJC', tz: 'America/Los_Angeles', lat: 37.3639, lon: -121.9289, city: { en: 'San Jose · Silicon Valley', es: 'San José · Silicon Valley' }, name: { en: 'San José Mineta International Airport', es: 'Aeropuerto Internacional Mineta de San José' } },
      { id: 'SEA', tz: 'America/Los_Angeles', lat: 47.4502, lon: -122.3088, city: { en: 'Seattle', es: 'Seattle' }, name: { en: 'Seattle-Tacoma International Airport', es: 'Aeropuerto Internacional de Seattle-Tacoma' } }
    ],

    // Places offered in the destination search. `top` = shown before the user types (lower = first).
    // `alias` = extra search words. Coordinates are approximate.
    places: [
      // New York area
      { id: 'nyc-midtown', type: 'center', top: 1, lat: 40.7580, lon: -73.9855, alias: 'manhattan times square midtown nyc new york', name: { en: 'Midtown Manhattan (Times Square)', es: 'Midtown Manhattan (Times Square)' } },
      { id: 'nyc-downtown', type: 'center', top: 2, lat: 40.7075, lon: -74.0113, alias: 'wall street fidi financial district world trade center wtc downtown', name: { en: 'Lower Manhattan (Financial District)', es: 'Bajo Manhattan (Distrito Financiero)' } },
      { id: 'brooklyn', type: 'district', top: 3, lat: 40.6928, lon: -73.9903, alias: 'brooklyn heights dumbo', name: { en: 'Downtown Brooklyn', es: 'Centro de Brooklyn' } },
      { id: 'penn-station', type: 'station', top: 4, lat: 40.7506, lon: -73.9935, alias: 'amtrak madison square garden msg', name: { en: 'Penn Station', es: 'Estación Penn' } },
      { id: 'nyc-plaza', type: 'hotel', top: 5, lat: 40.7646, lon: -73.9744, alias: 'plaza fifth avenue central park', name: { en: 'The Plaza Hotel', es: 'Hotel The Plaza' } },
      { id: 'nyc-ues', type: 'district', top: 6, lat: 40.7736, lon: -73.9566, alias: 'upper east side', name: { en: 'Upper East Side', es: 'Upper East Side' } },
      { id: 'grand-central', type: 'station', top: 7, lat: 40.7527, lon: -73.9772, alias: 'metro north grand central', name: { en: 'Grand Central Terminal', es: 'Grand Central Terminal' } },
      { id: 'nyc-cruise', type: 'port', top: 8, lat: 40.7696, lon: -73.9961, alias: 'cruise pier 88 90 crucero', name: { en: 'Manhattan Cruise Terminal', es: 'Terminal de cruceros de Manhattan' } },
      { id: 'nyc-uws', type: 'district', lat: 40.7870, lon: -73.9754, alias: 'upper west side', name: { en: 'Upper West Side', es: 'Upper West Side' } },
      { id: 'hudson-yards', type: 'district', lat: 40.7536, lon: -74.0010, alias: 'hudson yards javits', name: { en: 'Hudson Yards', es: 'Hudson Yards' } },
      { id: 'williamsburg', type: 'district', lat: 40.7081, lon: -73.9571, alias: 'williamsburg brooklyn', name: { en: 'Williamsburg, Brooklyn', es: 'Williamsburg, Brooklyn' } },
      { id: 'lic', type: 'district', lat: 40.7447, lon: -73.9485, alias: 'long island city queens', name: { en: 'Long Island City', es: 'Long Island City' } },
      { id: 'jersey-city', type: 'city', lat: 40.7178, lon: -74.0431, alias: 'jersey city nj', name: { en: 'Jersey City, NJ', es: 'Jersey City, NJ' } },
      { id: 'hoboken', type: 'city', lat: 40.7440, lon: -74.0324, alias: 'hoboken nj', name: { en: 'Hoboken, NJ', es: 'Hoboken, NJ' } },
      { id: 'newark-downtown', type: 'center', top: 9, lat: 40.7357, lon: -74.1724, alias: 'newark nj prudential center', name: { en: 'Downtown Newark', es: 'Centro de Newark' } },
      { id: 'metlife', type: 'venue', lat: 40.8135, lon: -74.0745, alias: 'metlife stadium giants jets meadowlands', name: { en: 'MetLife Stadium', es: 'Estadio MetLife' } },
      { id: 'stamford', type: 'city', lat: 41.0534, lon: -73.5387, alias: 'stamford connecticut ct', name: { en: 'Stamford, CT', es: 'Stamford, CT' } },
      { id: 'princeton', type: 'city', lat: 40.3573, lon: -74.6672, alias: 'princeton university nj', name: { en: 'Princeton, NJ', es: 'Princeton, NJ' } },
      { id: 'hamptons', type: 'resort', lat: 40.9634, lon: -72.1848, alias: 'hamptons east hampton southampton', name: { en: 'The Hamptons (East Hampton)', es: 'The Hamptons (East Hampton)' } },
      { id: 'philadelphia', type: 'city', lat: 39.9526, lon: -75.1652, alias: 'philadelphia philly', name: { en: 'Philadelphia', es: 'Filadelfia' } },
      // Boston
      { id: 'bos-downtown', type: 'center', top: 1, lat: 42.3555, lon: -71.0565, alias: 'boston downtown', name: { en: 'Downtown Boston', es: 'Centro de Boston' } },
      { id: 'back-bay', type: 'district', top: 2, lat: 42.3503, lon: -71.0810, alias: 'back bay copley', name: { en: 'Back Bay', es: 'Back Bay' } },
      { id: 'cambridge', type: 'city', top: 3, lat: 42.3736, lon: -71.1190, alias: 'harvard mit cambridge', name: { en: 'Cambridge (Harvard, MIT)', es: 'Cambridge (Harvard, MIT)' } },
      { id: 'seaport', type: 'district', top: 4, lat: 42.3519, lon: -71.0446, alias: 'seaport convention', name: { en: 'Seaport District', es: 'Seaport District' } },
      { id: 'bos-south', type: 'station', top: 5, lat: 42.3523, lon: -71.0552, alias: 'south station amtrak', name: { en: 'South Station', es: 'South Station' } },
      { id: 'providence', type: 'city', lat: 41.8240, lon: -71.4128, alias: 'providence rhode island ri', name: { en: 'Providence, RI', es: 'Providence, RI' } },
      // Washington, D.C.
      { id: 'dc-downtown', type: 'center', top: 1, lat: 38.8977, lon: -77.0365, alias: 'dc white house national mall downtown', name: { en: 'Downtown Washington, D.C.', es: 'Centro de Washington D. C.' } },
      { id: 'dc-union', type: 'station', top: 2, lat: 38.8973, lon: -77.0063, alias: 'union station amtrak capitol', name: { en: 'Union Station, Washington', es: 'Union Station, Washington' } },
      { id: 'georgetown', type: 'district', top: 3, lat: 38.9097, lon: -77.0654, alias: 'georgetown university', name: { en: 'Georgetown', es: 'Georgetown' } },
      { id: 'tysons', type: 'city', top: 4, lat: 38.9187, lon: -77.2311, alias: 'tysons corner virginia va', name: { en: 'Tysons, VA', es: 'Tysons, VA' } },
      { id: 'pentagon-city', type: 'district', lat: 38.8623, lon: -77.0595, alias: 'arlington pentagon virginia va', name: { en: 'Arlington (Pentagon City)', es: 'Arlington (Pentagon City)' } },
      { id: 'baltimore', type: 'city', lat: 39.2904, lon: -76.6122, alias: 'baltimore inner harbor md', name: { en: 'Baltimore', es: 'Baltimore' } },
      // Atlanta
      { id: 'atl-downtown', type: 'center', top: 1, lat: 33.7490, lon: -84.3880, alias: 'atlanta downtown', name: { en: 'Downtown Atlanta', es: 'Centro de Atlanta' } },
      { id: 'buckhead', type: 'district', top: 2, lat: 33.8381, lon: -84.3796, alias: 'buckhead', name: { en: 'Buckhead', es: 'Buckhead' } },
      { id: 'atl-midtown', type: 'district', top: 3, lat: 33.7816, lon: -84.3830, alias: 'midtown atlanta', name: { en: 'Midtown Atlanta', es: 'Midtown Atlanta' } },
      { id: 'gwcc', type: 'venue', top: 4, lat: 33.7590, lon: -84.3972, alias: 'georgia world congress center convention mercedes benz stadium', name: { en: 'Georgia World Congress Center', es: 'Georgia World Congress Center' } },
      // Miami & Fort Lauderdale
      { id: 'south-beach', type: 'district', top: 1, lat: 25.7826, lon: -80.1341, alias: 'miami beach ocean drive south beach', name: { en: 'South Beach, Miami Beach', es: 'South Beach, Miami Beach' } },
      { id: 'brickell', type: 'center', top: 2, lat: 25.7617, lon: -80.1918, alias: 'brickell downtown miami', name: { en: 'Brickell · Downtown Miami', es: 'Brickell · Centro de Miami' } },
      { id: 'port-miami', type: 'port', top: 3, lat: 25.7781, lon: -80.1794, alias: 'cruise port of miami crucero', name: { en: 'PortMiami Cruise Terminals', es: 'Terminales de cruceros de PortMiami' } },
      { id: 'port-everglades', type: 'port', top: 4, lat: 26.0920, lon: -80.1220, alias: 'cruise port everglades crucero', name: { en: 'Port Everglades Cruise Terminals', es: 'Terminales de cruceros de Port Everglades' } },
      { id: 'fll-downtown', type: 'center', top: 5, lat: 26.1224, lon: -80.1373, alias: 'fort lauderdale las olas', name: { en: 'Downtown Fort Lauderdale', es: 'Centro de Fort Lauderdale' } },
      { id: 'coral-gables', type: 'city', lat: 25.7215, lon: -80.2684, alias: 'coral gables university of miami', name: { en: 'Coral Gables', es: 'Coral Gables' } },
      { id: 'key-biscayne', type: 'district', lat: 25.6935, lon: -80.1628, alias: 'key biscayne', name: { en: 'Key Biscayne', es: 'Key Biscayne' } },
      { id: 'palm-beach', type: 'city', lat: 26.7056, lon: -80.0364, alias: 'palm beach west palm', name: { en: 'Palm Beach', es: 'Palm Beach' } },
      { id: 'key-west', type: 'city', lat: 24.5551, lon: -81.7800, alias: 'key west florida keys', name: { en: 'Key West', es: 'Key West' } },
      // Orlando
      { id: 'disney-world', type: 'resort', top: 1, lat: 28.3852, lon: -81.5639, alias: 'disney world magic kingdom epcot', name: { en: 'Walt Disney World Resort', es: 'Walt Disney World Resort' } },
      { id: 'universal-orlando', type: 'resort', top: 2, lat: 28.4743, lon: -81.4677, alias: 'universal studios orlando', name: { en: 'Universal Orlando Resort', es: 'Universal Orlando Resort' } },
      { id: 'i-drive', type: 'district', top: 3, lat: 28.4522, lon: -81.4708, alias: 'international drive orange county convention center', name: { en: 'International Drive', es: 'International Drive' } },
      { id: 'orl-downtown', type: 'center', top: 4, lat: 28.5383, lon: -81.3792, alias: 'downtown orlando', name: { en: 'Downtown Orlando', es: 'Centro de Orlando' } },
      { id: 'port-canaveral', type: 'port', top: 5, lat: 28.4108, lon: -80.6188, alias: 'cruise port canaveral crucero', name: { en: 'Port Canaveral Cruise Terminals', es: 'Terminales de cruceros de Port Canaveral' } },
      { id: 'kennedy', type: 'landmark', lat: 28.5729, lon: -80.6490, alias: 'kennedy space center nasa', name: { en: 'Kennedy Space Center', es: 'Centro Espacial Kennedy' } },
      { id: 'tampa', type: 'city', lat: 27.9506, lon: -82.4572, alias: 'tampa', name: { en: 'Tampa', es: 'Tampa' } },
      // Chicago
      { id: 'chi-loop', type: 'center', top: 1, lat: 41.8837, lon: -87.6289, alias: 'downtown chicago loop', name: { en: 'The Loop (Downtown Chicago)', es: 'The Loop (centro de Chicago)' } },
      { id: 'chi-mag-mile', type: 'district', top: 2, lat: 41.8948, lon: -87.6243, alias: 'magnificent mile michigan avenue river north', name: { en: 'Magnificent Mile', es: 'Magnificent Mile' } },
      { id: 'mccormick', type: 'venue', top: 3, lat: 41.8517, lon: -87.6157, alias: 'mccormick place convention', name: { en: 'McCormick Place', es: 'McCormick Place' } },
      { id: 'chi-union', type: 'station', top: 4, lat: 41.8787, lon: -87.6403, alias: 'union station amtrak', name: { en: 'Chicago Union Station', es: 'Chicago Union Station' } },
      { id: 'evanston', type: 'city', lat: 42.0451, lon: -87.6877, alias: 'evanston northwestern', name: { en: 'Evanston (Northwestern)', es: 'Evanston (Northwestern)' } },
      { id: 'schaumburg', type: 'city', lat: 42.0334, lon: -88.0834, alias: 'schaumburg', name: { en: 'Schaumburg', es: 'Schaumburg' } },
      { id: 'milwaukee', type: 'city', lat: 43.0389, lon: -87.9065, alias: 'milwaukee wisconsin', name: { en: 'Milwaukee', es: 'Milwaukee' } },
      // Dallas · Fort Worth
      { id: 'dal-downtown', type: 'center', top: 1, lat: 32.7767, lon: -96.7970, alias: 'downtown dallas', name: { en: 'Downtown Dallas', es: 'Centro de Dallas' } },
      { id: 'dal-uptown', type: 'district', top: 2, lat: 32.8010, lon: -96.8010, alias: 'uptown dallas', name: { en: 'Uptown Dallas', es: 'Uptown Dallas' } },
      { id: 'fw-downtown', type: 'center', top: 3, lat: 32.7555, lon: -97.3308, alias: 'fort worth downtown sundance', name: { en: 'Downtown Fort Worth', es: 'Centro de Fort Worth' } },
      { id: 'plano', type: 'city', top: 4, lat: 33.0198, lon: -96.6989, alias: 'plano legacy', name: { en: 'Plano', es: 'Plano' } },
      { id: 'att-stadium', type: 'venue', top: 5, lat: 32.7473, lon: -97.0945, alias: 'at&t stadium cowboys arlington', name: { en: 'AT&T Stadium (Arlington)', es: 'Estadio AT&T (Arlington)' } },
      { id: 'austin', type: 'city', lat: 30.2672, lon: -97.7431, alias: 'austin texas', name: { en: 'Austin', es: 'Austin' } },
      // Houston
      { id: 'hou-downtown', type: 'center', top: 1, lat: 29.7604, lon: -95.3698, alias: 'downtown houston', name: { en: 'Downtown Houston', es: 'Centro de Houston' } },
      { id: 'tmc', type: 'venue', top: 2, lat: 29.7070, lon: -95.4010, alias: 'texas medical center hospital md anderson', name: { en: 'Texas Medical Center', es: 'Texas Medical Center' } },
      { id: 'galleria', type: 'district', top: 3, lat: 29.7390, lon: -95.4613, alias: 'galleria uptown houston', name: { en: 'Uptown · The Galleria', es: 'Uptown · The Galleria' } },
      { id: 'galveston', type: 'port', top: 4, lat: 29.3099, lon: -94.7930, alias: 'galveston cruise crucero', name: { en: 'Galveston Cruise Terminals', es: 'Terminales de cruceros de Galveston' } },
      { id: 'the-woodlands', type: 'city', lat: 30.1658, lon: -95.4613, alias: 'the woodlands', name: { en: 'The Woodlands', es: 'The Woodlands' } },
      // Denver
      { id: 'den-downtown', type: 'center', top: 1, lat: 39.7392, lon: -104.9903, alias: 'downtown denver lodo', name: { en: 'Downtown Denver', es: 'Centro de Denver' } },
      { id: 'boulder', type: 'city', top: 2, lat: 40.0150, lon: -105.2705, alias: 'boulder cu', name: { en: 'Boulder', es: 'Boulder' } },
      { id: 'vail', type: 'resort', top: 3, lat: 39.6403, lon: -106.3742, alias: 'vail ski', name: { en: 'Vail', es: 'Vail' } },
      { id: 'breckenridge', type: 'resort', top: 4, lat: 39.4817, lon: -106.0384, alias: 'breckenridge ski', name: { en: 'Breckenridge', es: 'Breckenridge' } },
      { id: 'den-union', type: 'station', lat: 39.7527, lon: -105.0003, alias: 'union station denver', name: { en: 'Denver Union Station', es: 'Denver Union Station' } },
      { id: 'aspen', type: 'resort', lat: 39.1911, lon: -106.8175, alias: 'aspen snowmass ski', name: { en: 'Aspen', es: 'Aspen' } },
      // Phoenix
      { id: 'phx-downtown', type: 'center', top: 1, lat: 33.4484, lon: -112.0740, alias: 'downtown phoenix', name: { en: 'Downtown Phoenix', es: 'Centro de Phoenix' } },
      { id: 'scottsdale', type: 'city', top: 2, lat: 33.4942, lon: -111.9261, alias: 'scottsdale old town', name: { en: 'Scottsdale', es: 'Scottsdale' } },
      { id: 'tempe', type: 'city', top: 3, lat: 33.4255, lon: -111.9400, alias: 'tempe asu arizona state', name: { en: 'Tempe (ASU)', es: 'Tempe (ASU)' } },
      { id: 'sedona', type: 'city', lat: 34.8697, lon: -111.7610, alias: 'sedona', name: { en: 'Sedona', es: 'Sedona' } },
      // Las Vegas
      { id: 'vegas-strip', type: 'district', top: 1, lat: 36.1147, lon: -115.1728, alias: 'las vegas strip casino bellagio caesars', name: { en: 'The Las Vegas Strip', es: 'The Strip de Las Vegas' } },
      { id: 'fremont', type: 'district', top: 2, lat: 36.1699, lon: -115.1398, alias: 'fremont street downtown las vegas', name: { en: 'Fremont Street (Downtown Las Vegas)', es: 'Fremont Street (centro de Las Vegas)' } },
      { id: 'lvcc', type: 'venue', top: 3, lat: 36.1314, lon: -115.1517, alias: 'las vegas convention center ces', name: { en: 'Las Vegas Convention Center', es: 'Centro de Convenciones de Las Vegas' } },
      { id: 'henderson', type: 'city', lat: 36.0395, lon: -114.9817, alias: 'henderson', name: { en: 'Henderson', es: 'Henderson' } },
      { id: 'hoover-dam', type: 'landmark', lat: 36.0161, lon: -114.7377, alias: 'hoover dam', name: { en: 'Hoover Dam', es: 'Presa Hoover' } },
      // Los Angeles
      { id: 'la-downtown', type: 'center', top: 1, lat: 34.0522, lon: -118.2437, alias: 'dtla downtown los angeles la', name: { en: 'Downtown Los Angeles', es: 'Centro de Los Ángeles' } },
      { id: 'beverly-hills', type: 'district', top: 2, lat: 34.0736, lon: -118.4004, alias: 'beverly hills rodeo drive', name: { en: 'Beverly Hills', es: 'Beverly Hills' } },
      { id: 'santa-monica', type: 'district', top: 3, lat: 34.0195, lon: -118.4912, alias: 'santa monica pier beach', name: { en: 'Santa Monica', es: 'Santa Mónica' } },
      { id: 'hollywood', type: 'district', top: 4, lat: 34.0928, lon: -118.3287, alias: 'hollywood walk of fame', name: { en: 'Hollywood', es: 'Hollywood' } },
      { id: 'disneyland', type: 'resort', top: 5, lat: 33.8121, lon: -117.9190, alias: 'disneyland anaheim disney', name: { en: 'Disneyland Resort (Anaheim)', es: 'Disneyland Resort (Anaheim)' } },
      { id: 'universal-hollywood', type: 'resort', top: 6, lat: 34.1381, lon: -118.3534, alias: 'universal studios hollywood', name: { en: 'Universal Studios Hollywood', es: 'Universal Studios Hollywood' } },
      { id: 'la-convention', type: 'venue', top: 7, lat: 34.0403, lon: -118.2696, alias: 'la convention center crypto arena la live', name: { en: 'LA Convention Center', es: 'Centro de Convenciones de Los Ángeles' } },
      { id: 'long-beach-cruise', type: 'port', top: 8, lat: 33.7509, lon: -118.1897, alias: 'long beach cruise queen mary carnival crucero', name: { en: 'Long Beach Cruise Terminal', es: 'Terminal de cruceros de Long Beach' } },
      { id: 'san-pedro-cruise', type: 'port', lat: 33.7472, lon: -118.2766, alias: 'san pedro port of los angeles cruise crucero', name: { en: 'Port of Los Angeles Cruise Terminal', es: 'Terminal de cruceros del Puerto de Los Ángeles' } },
      { id: 'la-union', type: 'station', lat: 34.0562, lon: -118.2365, alias: 'union station amtrak', name: { en: 'Union Station Los Angeles', es: 'Union Station Los Ángeles' } },
      { id: 'pasadena', type: 'city', lat: 34.1478, lon: -118.1445, alias: 'pasadena rose bowl', name: { en: 'Pasadena', es: 'Pasadena' } },
      { id: 'malibu', type: 'district', lat: 34.0259, lon: -118.7798, alias: 'malibu', name: { en: 'Malibu', es: 'Malibú' } },
      { id: 'palm-springs', type: 'city', lat: 33.8303, lon: -116.5453, alias: 'palm springs coachella', name: { en: 'Palm Springs', es: 'Palm Springs' } },
      { id: 'santa-barbara', type: 'city', lat: 34.4208, lon: -119.6982, alias: 'santa barbara', name: { en: 'Santa Barbara', es: 'Santa Bárbara' } },
      // San Diego
      { id: 'sd-downtown', type: 'center', top: 1, lat: 32.7157, lon: -117.1611, alias: 'gaslamp quarter downtown san diego', name: { en: 'Downtown San Diego (Gaslamp Quarter)', es: 'Centro de San Diego (Gaslamp Quarter)' } },
      { id: 'la-jolla', type: 'district', top: 2, lat: 32.8328, lon: -117.2713, alias: 'la jolla ucsd', name: { en: 'La Jolla', es: 'La Jolla' } },
      { id: 'coronado', type: 'hotel', top: 3, lat: 32.6809, lon: -117.1784, alias: 'hotel del coronado island', name: { en: 'Hotel del Coronado', es: 'Hotel del Coronado' } },
      { id: 'sd-cruise', type: 'port', top: 4, lat: 32.7166, lon: -117.1739, alias: 'cruise ship terminal crucero', name: { en: 'San Diego Cruise Ship Terminal', es: 'Terminal de cruceros de San Diego' } },
      // San Francisco Bay Area
      { id: 'sf-union-square', type: 'center', top: 1, lat: 37.7880, lon: -122.4075, alias: 'union square downtown san francisco sf', name: { en: 'Union Square, San Francisco', es: 'Union Square, San Francisco' } },
      { id: 'sf-fidi', type: 'district', top: 2, lat: 37.7946, lon: -122.3999, alias: 'financial district embarcadero salesforce tower', name: { en: 'Financial District, San Francisco', es: 'Distrito Financiero, San Francisco' } },
      { id: 'moscone', type: 'venue', top: 3, lat: 37.7840, lon: -122.4010, alias: 'moscone center convention', name: { en: 'Moscone Center', es: 'Moscone Center' } },
      { id: 'fishermans-wharf', type: 'landmark', top: 4, lat: 37.8080, lon: -122.4177, alias: 'fishermans wharf pier 39', name: { en: 'Fisherman\'s Wharf', es: 'Fisherman\'s Wharf' } },
      { id: 'palo-alto', type: 'city', top: 5, lat: 37.4419, lon: -122.1430, alias: 'palo alto stanford', name: { en: 'Palo Alto (Stanford)', es: 'Palo Alto (Stanford)' } },
      { id: 'mountain-view', type: 'city', top: 6, lat: 37.3861, lon: -122.0839, alias: 'mountain view google', name: { en: 'Mountain View', es: 'Mountain View' } },
      { id: 'sj-downtown', type: 'center', top: 7, lat: 37.3382, lon: -121.8863, alias: 'downtown san jose', name: { en: 'Downtown San Jose', es: 'Centro de San José' } },
      { id: 'cupertino', type: 'city', top: 8, lat: 37.3230, lon: -122.0322, alias: 'cupertino apple park', name: { en: 'Cupertino', es: 'Cupertino' } },
      { id: 'oakland-downtown', type: 'center', top: 9, lat: 37.8044, lon: -122.2712, alias: 'downtown oakland', name: { en: 'Downtown Oakland', es: 'Centro de Oakland' } },
      { id: 'napa', type: 'resort', lat: 38.2975, lon: -122.2869, alias: 'napa valley wine country', name: { en: 'Napa Valley', es: 'Valle de Napa' } },
      { id: 'sf-cruise', type: 'port', lat: 37.8037, lon: -122.4027, alias: 'cruise terminal pier 27 crucero', name: { en: 'San Francisco Cruise Terminal (Pier 27)', es: 'Terminal de cruceros de San Francisco (Pier 27)' } },
      // Seattle
      { id: 'sea-downtown', type: 'center', top: 1, lat: 47.6062, lon: -122.3321, alias: 'downtown seattle pike place', name: { en: 'Downtown Seattle', es: 'Centro de Seattle' } },
      { id: 'bellevue', type: 'city', top: 2, lat: 47.6101, lon: -122.2015, alias: 'bellevue', name: { en: 'Bellevue', es: 'Bellevue' } },
      { id: 'redmond', type: 'city', top: 3, lat: 47.6740, lon: -122.1215, alias: 'redmond microsoft', name: { en: 'Redmond (Microsoft)', es: 'Redmond (Microsoft)' } },
      { id: 'pier-91', type: 'port', top: 4, lat: 47.6290, lon: -122.3870, alias: 'smith cove cruise pier 91 crucero', name: { en: 'Smith Cove Cruise Terminal (Pier 91)', es: 'Terminal de cruceros Smith Cove (Pier 91)' } },
      { id: 'pier-66', type: 'port', lat: 47.6105, lon: -122.3460, alias: 'bell street cruise pier 66 crucero', name: { en: 'Bell Street Cruise Terminal (Pier 66)', es: 'Terminal de cruceros Bell Street (Pier 66)' } }
    ],

    popularRoutes: [
      { airport: 'JFK', place: 'nyc-midtown' },
      { airport: 'LGA', place: 'nyc-downtown' },
      { airport: 'LAX', place: 'beverly-hills' },
      { airport: 'SFO', place: 'sf-union-square' },
      { airport: 'ORD', place: 'chi-loop' },
      { airport: 'MIA', place: 'port-miami' },
      { airport: 'MCO', place: 'disney-world' },
      { airport: 'LAS', place: 'vegas-strip' }
    ],

    // TODO: placeholder reviews — replace with real customer reviews before launch.
    reviews: [
      { name: 'Sarah M.', from: 'New York, NY', lang: 'en', text: 'Our flight landed two hours late and our chauffeur was still waiting at baggage claim with a sign. The price was exactly what we were quoted.' },
      { name: 'Carlos R.', from: 'Miami, FL', lang: 'es', text: 'Reservé el traslado para mis padres desde MIA. El chofer los ayudó con las maletas y me mandó mensajes durante todo el viaje. ¡Excelente servicio!' },
      { name: 'James T.', from: 'Chicago, IL', lang: 'en', text: 'Booked an SUV for a team of five from O\'Hare. Spotless car, professional driver, and the receipt matched the quote to the cent.' }
    ]
  };
});
