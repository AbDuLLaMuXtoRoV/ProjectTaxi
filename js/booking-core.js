/*
 * Safar — booking validation and normalisation.
 * Shared by server.js and by the browser's offline demo mode, so both
 * accept exactly the same bookings and compute exactly the same price.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createBookingCore = factory;
})(this, function createBookingCore(config, pricing) {
  const MODES = ['from', 'to', 'hourly'];
  const VIA = ['call', 'telegram', 'whatsapp'];
  const PAY = ['cash', 'card', 'app'];
  const LANGS = ['uz', 'ru', 'en'];
  const DRIVER_LANGS = ['any', 'uz', 'ru', 'en'];
  const ACTIVE = ['new', 'confirmed', 'assigned'];
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, '0');

  // Returns an E.164 number ("+998901234567") or '' when the input is not a plausible phone.
  function normPhone(value) {
    let raw = String(value || '').trim();
    // The form pre-fills "+998 "; a visitor may type their own country code after it.
    if (raw.lastIndexOf('+') > 0) raw = raw.slice(raw.lastIndexOf('+'));
    raw = raw.replace(/^\+998\s*(?=00)/, '');
    let digits = raw.replace(/\D/g, '');
    const international = raw.startsWith('+') || raw.startsWith('00');
    if (raw.startsWith('00')) digits = digits.slice(2);
    if (!international && digits.length === 9) digits = '998' + digits; // local Uzbek number
    if (digits.startsWith('998')) return digits.length === 12 ? '+' + digits : '';
    return digits.length >= 8 && digits.length <= 15 ? '+' + digits : '';
  }

  function fmtPhone(value) {
    const d = String(value || '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
    return value ? '+' + d : '';
  }

  const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const text = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');
  const int = (v, min, max) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
  const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const epochOf = (date, time) => Date.parse(`${date}T${time}:00${config.utcOffset}`);
  const inUzbekistan = (lat, lon) => lat > 36.5 && lat < 46.5 && lon > 55 && lon < 74;

  function localParts(ts) {
    const d = new Date(ts + config.utcOffsetMin * 60000);
    return {
      date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
    };
  }

  function person(p) {
    p = p || {};
    return { name: str(p.name, 80), phone: normPhone(p.phone) };
  }

  /**
   * Validates a booking request. Returns { booking } or { error, field }.
   * The price is always recomputed here — the client's number is never trusted.
   */
  function normalize(body, now) {
    now = now || Date.now();
    const fail = (field, error) => ({ error, field });
    if (!body || typeof body !== 'object') return fail('', 'invalid');

    const mode = MODES.includes(body.mode) ? body.mode : null;
    if (!mode) return fail('mode', 'mode');
    const airport = config.airports.find((a) => a.id === body.airport) || null;
    if (!airport && mode !== 'hourly') return fail('airport', 'airport');

    const pl = body.place || {};
    const lat = Number(pl.lat);
    const lon = Number(pl.lon);
    const placeName = str(pl.name, 160);
    if (!placeName || !Number.isFinite(lat) || !Number.isFinite(lon) || !inUzbekistan(lat, lon)) return fail('place', 'place');
    const place = { id: str(pl.id, 60), type: str(pl.type, 20), name: placeName, sub: str(pl.sub, 160), lat: +lat.toFixed(6), lon: +lon.toFixed(6) };

    const w = body.when || {};
    const asap = w.asap === true;
    let date, time, pickupAt;
    if (asap) {
      pickupAt = now + config.asapLeadMin * 60000;
      ({ date, time } = localParts(pickupAt));
    } else {
      date = str(w.date, 10);
      time = str(w.time, 5);
      if (!isDate(date) || !isTime(time)) return fail('when', 'when');
      pickupAt = epochOf(date, time);
      if (pickupAt < now - 5 * 60000) return fail('when', 'past');
      if (pickupAt > now + 366 * DAY) return fail('when', 'too_far');
    }

    const pax = int(body.pax, 1, 16);
    const bags = int(body.bags, 0, 30);
    if (pax === null || bags === null) return fail('pax', 'pax');
    const hours = mode === 'hourly' ? pricing.clampHours(body.hours) : 0;
    const vehicle = pricing.vehicle(body.vehicle);
    if (!vehicle) return fail('vehicle', 'vehicle');
    if (!pricing.fits(vehicle, pax, bags)) return fail('vehicle', 'capacity');

    let ret = null;
    if (body.ret && mode !== 'hourly') {
      const rd = str(body.ret.date, 10);
      const rt = str(body.ret.time, 5);
      if (!isDate(rd) || !isTime(rt)) return fail('ret', 'ret');
      const rAt = epochOf(rd, rt);
      if (rAt < pickupAt + 3600000 || rAt > now + 366 * DAY) return fail('ret', 'ret_time');
      ret = { date: rd, time: rt, pickupAt: new Date(rAt).toISOString() };
    }

    const passenger = person(body.passenger);
    if (passenger.name.length < 2) return fail('p-name', 'name');
    if (!passenger.phone) return fail('p-phone', 'phone');
    let booker = null;
    if (body.booker) {
      booker = person(body.booker);
      if (booker.name.length < 2) return fail('b-name', 'name');
      if (!booker.phone) return fail('b-phone', 'phone');
    }

    const email = str(body.email, 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('p-email', 'email');
    const flight = str(body.flight, 10).toUpperCase();
    if (flight && !/^[A-Z0-9]{2,3}[\s-]?\d{1,4}[A-Z]?$/.test(flight)) return fail('flight', 'flight');

    const from = mode === 'to' || mode === 'hourly' ? place : airport;
    const to = mode === 'from' ? place : mode === 'to' ? airport : null;
    const q = pricing.quote({ mode, from, to, hours, vehicleId: vehicle.id, returnTrip: !!ret, promo: body.promo });

    return {
      booking: {
        status: 'new',
        mode,
        airport: airport ? airport.id : '',
        place,
        asap,
        date,
        time,
        pickupAt: new Date(pickupAt).toISOString(),
        pax,
        bags,
        hours,
        vehicle: vehicle.id,
        ret,
        passenger,
        booker,
        via: VIA.includes(body.via) ? body.via : 'call',
        email,
        flight,
        sign: mode === 'from' ? str(body.sign, 60) || passenger.name : '',
        address: str(body.address, 200),
        comment: text(body.comment, 500),
        childSeats: int(body.childSeats, 0, 3) || 0,
        assist: body.assist === true,
        driverLang: DRIVER_LANGS.includes(body.driverLang) ? body.driverLang : 'any',
        pay: PAY.includes(body.pay) ? body.pay : 'cash',
        lang: LANGS.includes(body.lang) ? body.lang : 'ru',
        price: { currency: 'UZS', km: q.km, oneWay: q.oneWay, returnPrice: q.returnPrice, promo: q.promo, discount: q.discount, total: q.total }
      }
    };
  }

  function phoneMatches(b, phone) {
    const p = normPhone(phone);
    return !!p && (b.passenger.phone === p || (!!b.booker && b.booker.phone === p));
  }

  function canCancel(b, now) {
    return ACTIVE.includes(b.status) && Date.parse(b.pickupAt) - (now || Date.now()) >= config.freeCancelHours * 3600000;
  }

  // 6-digit numbers are easy to read out over the phone.
  function newCode(exists) {
    let code;
    do code = String(100000 + Math.floor(Math.random() * 900000));
    while (exists(code));
    return code;
  }

  return { normPhone, fmtPhone, normalize, phoneMatches, canCancel, newCode, epochOf, localParts };
});
