/*
 * Safar — flat-rate calculator (US dollars, miles).
 * Shared by the browser (window.createPricing) and server.js, so the price
 * the client sees is exactly the price the server stores.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createPricing = factory;
})(this, function createPricing(config) {
  const P = config.pricing;

  function haversineMiles(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * 3958.8 * Math.asin(Math.sqrt(h));
  }

  // Road distance estimate from a straight line: city streets wind more than highways.
  function roadMiles(a, b) {
    const d = haversineMiles(a, b);
    return d * (1.15 + 0.2 * Math.exp(-d / 25));
  }

  // Rough drive time with typical traffic, used when live routing is unavailable.
  function estimateMinutes(mi) {
    const mph = mi < 25 ? 22 : mi < 60 ? 32 : 50;
    return Math.max(10, Math.round((mi / mph) * 60 / 5) * 5);
  }

  const roundUp = (v, step) => Math.ceil(v / step - 1e-9) * step;
  const round1 = (v) => Math.round(v);

  function vehicle(id) {
    return config.vehicles.find((v) => v.id === id) || null;
  }

  function fits(v, pax, bags) {
    return pax <= v.pax && bags <= v.bags;
  }

  function clampHours(h) {
    return Math.min(P.maxHours, Math.max(P.minHours, Math.round(Number(h) || 0)));
  }

  function tripPrice(v, mi) {
    const near = Math.min(mi, P.longDistanceFromMi);
    const far = Math.max(0, mi - P.longDistanceFromMi);
    const raw = v.base + v.perMile * (near + far * P.longDistanceFactor);
    return roundUp(Math.max(raw, v.min), P.roundTo);
  }

  function hourlyPrice(v, hours) {
    return roundUp(v.hour * clampHours(hours), P.roundTo);
  }

  function promoRate(code) {
    const key = String(code || '').trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(config.promoCodes, key) ? config.promoCodes[key] : 0;
  }

  /**
   * trip: { mode: 'from'|'to'|'hourly', from:{lat,lon}, to:{lat,lon}, hours,
   *         vehicleId, returnTrip: boolean, promo: string }
   */
  function quote(trip) {
    const v = vehicle(trip.vehicleId);
    if (!v) return null;
    const hourly = trip.mode === 'hourly';
    const mi = hourly ? 0 : roadMiles(trip.from, trip.to);
    const oneWay = hourly ? hourlyPrice(v, trip.hours) : tripPrice(v, mi);
    const returnPrice = !hourly && trip.returnTrip ? round1(oneWay * (1 - P.returnDiscount)) : 0;
    const subtotal = oneWay + returnPrice;
    const promoPct = promoRate(trip.promo);
    const discount = promoPct ? round1(subtotal * promoPct) : 0;
    return {
      vehicleId: v.id,
      mi: Math.round(mi * 10) / 10,
      hours: hourly ? clampHours(trip.hours) : 0,
      oneWay,
      returnPrice,
      subtotal,
      promo: promoPct ? String(trip.promo).trim().toUpperCase() : '',
      promoPct,
      discount,
      total: subtotal - discount
    };
  }

  return { haversineMiles, roadMiles, estimateMinutes, vehicle, fits, clampHours, tripPrice, hourlyPrice, promoRate, quote };
});
