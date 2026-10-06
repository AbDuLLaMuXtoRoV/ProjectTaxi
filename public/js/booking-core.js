/*
 * LimoBay — booking validation and normalisation.
 * Shared by server.js and by the browser's offline demo mode, so both
 * accept exactly the same bookings and compute exactly the same price.
 * Times are wall-clock times in the airport's own time zone (DST-aware).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createBookingCore = factory;
})(this, function createBookingCore(config, pricing) {
  const MODES = ['from', 'to', 'hourly'];
  const VIA = ['call', 'sms', 'whatsapp'];
  const PAY = ['card', 'app', 'cash'];
  const LANGS = ['en', 'es'];
  const DRIVER_LANGS = ['any', 'en', 'es'];
  const ACTIVE = ['new', 'confirmed', 'assigned'];
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, '0');
  const PREFIX_DIGITS = config.phonePrefix.replace(/\D/g, '');

  // ------------------------------------------------------------ time zones
  const formatters = new Map();
  function formatter(tz) {
    if (!formatters.has(tz)) {
      formatters.set(tz, new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    }
    return formatters.get(tz);
  }

  // Wall-clock date and time of a moment in a time zone: { date: 'YYYY-MM-DD', time: 'HH:MM' }.
  function localParts(ts, tz) {
    const p = {};
    formatter(tz).formatToParts(new Date(ts)).forEach((x) => { p[x.type] = x.value; });
    const hour = p.hour === '24' ? '00' : p.hour;
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}`, second: Number(p.second) };
  }

  function offsetMs(ts, tz) {
    const p = localParts(ts, tz);
    return Date.parse(`${p.date}T${p.time}:${pad(p.second)}Z`) - Math.floor(ts / 1000) * 1000;
  }

  // Moment (ms) of a wall-clock date and time in a time zone. Two passes handle daylight-saving changes.
  function epochOf(date, time, tz) {
    const naive = Date.parse(`${date}T${time}:00Z`);
    const first = naive - offsetMs(naive, tz);
    return naive - offsetMs(first, tz);
  }

  // ---------------------------------------------------------------- phones
  // Returns an E.164 number ("+12125550147") or '' when the input is not a plausible phone.
  function normPhone(value) {
    let raw = String(value || '').trim();
    // The form pre-fills the home prefix; a visitor may type their own country code after it.
    if (raw.lastIndexOf('+') > 0) raw = raw.slice(raw.lastIndexOf('+'));
    raw = raw.replace(new RegExp('^\\+' + PREFIX_DIGITS + '\\s*(?=00)'), '');
    let digits = raw.replace(/\D/g, '');
    const international = raw.startsWith('+') || raw.startsWith('00');
    if (raw.startsWith('00')) digits = digits.slice(2);
    if (!international) {
      if (digits.length === 10) digits = '1' + digits;               // US number without the 1
      else if (!(digits.length === 11 && digits.startsWith('1'))) return '';
    }
    if (digits.startsWith('1')) return digits.length === 11 && /^1[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? '+' + digits : '';
    return digits.length >= 8 && digits.length <= 15 ? '+' + digits : '';
  }

  function fmtPhone(value) {
    const d = String(value || '').replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return value ? '+' + d : '';
  }

  // ---------------------------------------------------------------- inputs
  const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const text = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');
  const int = (v, min, max) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
  const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const b = config.bounds;
  const inServiceArea = (lat, lon) => lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;

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
    // The airport also sets the time zone, so it is required for hourly trips too.
    const airport = config.airports.find((a) => a.id === body.airport) || null;
    if (!airport) return fail('airport', 'airport');
    const tz = airport.tz;

    const pl = body.place || {};
    const lat = Number(pl.lat);
    const lon = Number(pl.lon);
    const placeName = str(pl.name, 160);
    if (!placeName || !Number.isFinite(lat) || !Number.isFinite(lon) || !inServiceArea(lat, lon)) return fail('place', 'place');
    const place = { id: str(pl.id, 60), type: str(pl.type, 20), name: placeName, sub: str(pl.sub, 160), lat: +lat.toFixed(6), lon: +lon.toFixed(6) };

    const w = body.when || {};
    const asap = w.asap === true;
    let date, time, pickupAt;
    if (asap) {
      pickupAt = now + config.asapLeadMin * 60000;
      ({ date, time } = localParts(pickupAt, tz));
    } else {
      date = str(w.date, 10);
      time = str(w.time, 5);
      if (!isDate(date) || !isTime(time)) return fail('when', 'when');
      pickupAt = epochOf(date, time, tz);
      if (pickupAt < now - 5 * 60000) return fail('when', 'past');
      if (pickupAt > now + 366 * DAY) return fail('when', 'too_far');
    }

    const pax = int(body.pax, 1, 50);
    const bags = int(body.bags, 0, 50);
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
      const rAt = epochOf(rd, rt, tz);
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
        airport: airport.id,
        tz,
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
        pay: PAY.includes(body.pay) ? body.pay : 'card',
        lang: LANGS.includes(body.lang) ? body.lang : 'en',
        price: { currency: config.currency, mi: q.mi, oneWay: q.oneWay, returnPrice: q.returnPrice, promo: q.promo, discount: q.discount, total: q.total }
      }
    };
  }

  function phoneMatches(bk, phone) {
    const p = normPhone(phone);
    return !!p && (bk.passenger.phone === p || (!!bk.booker && bk.booker.phone === p));
  }

  function canCancel(bk, now) {
    return ACTIVE.includes(bk.status) && Date.parse(bk.pickupAt) - (now || Date.now()) >= config.freeCancelHours * 3600000;
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
