/*
 * Safar — fixed-price calculator.
 * Shared by the browser (window.createPricing) and server.js, so the price
 * the client sees is exactly the price the server stores.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createPricing = factory;
})(this, function createPricing(config) {
  const P = config.pricing;

  function haversineKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }

  // Road distance estimate from a straight line: city roads wind more than highways.
  function roadKm(a, b) {
    const d = haversineKm(a, b);
    return d * (1.15 + 0.2 * Math.exp(-d / 40));
  }

  // Rough drive time, used when live routing is unavailable.
  function estimateMinutes(km) {
    const speed = km < 25 ? 28 : km < 80 ? 50 : 70;
    return Math.max(10, Math.round((km / speed) * 60 / 5) * 5);
  }

  const roundUp = (v, step) => Math.ceil(v / step) * step;
  const round1000 = (v) => Math.round(v / 1000) * 1000;

  function vehicle(id) {
    return config.vehicles.find((v) => v.id === id) || null;
  }

  function fits(v, pax, bags) {
    return pax <= v.pax && bags <= v.bags;
  }

  function clampHours(h) {
    return Math.min(P.maxHours, Math.max(P.minHours, Math.round(Number(h) || 0)));
  }

  function tripPrice(v, km) {
    const near = Math.min(km, P.longDistanceFromKm);
    const far = Math.max(0, km - P.longDistanceFromKm);
    const raw = v.base + v.perKm * (near + far * P.longDistanceFactor);
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
    const km = hourly ? 0 : roadKm(trip.from, trip.to);
    const oneWay = hourly ? hourlyPrice(v, trip.hours) : tripPrice(v, km);
    const returnPrice = !hourly && trip.returnTrip ? round1000(oneWay * (1 - P.returnDiscount)) : 0;
    const subtotal = oneWay + returnPrice;
    const promoPct = promoRate(trip.promo);
    const discount = promoPct ? round1000(subtotal * promoPct) : 0;
    return {
      vehicleId: v.id,
      km: Math.round(km * 10) / 10,
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

  return { haversineKm, roadKm, estimateMinutes, vehicle, fits, clampHours, tripPrice, hourlyPrice, promoRate, quote };
});
