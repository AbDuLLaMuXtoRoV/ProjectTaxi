/* LimoBay — booking site logic (no framework, no build step). */
(function () {
  'use strict';

  const C = window.LIMOBAY_CONFIG;
  const P = window.createPricing(C);
  const core = window.createBookingCore(C, P);
  const I18N = window.LIMOBAY_I18N;
  const html = document.documentElement;

  // ------------------------------------------------------------------ helpers
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const icon = (id) => `<svg class="i" aria-hidden="true"><use href="#${id}"/></svg>`;
  const pad = (n) => String(n).padStart(2, '0');
  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  // Even reading window.localStorage throws when the browser blocks storage, so every access is guarded.
  function makeStore(getStorage) {
    return {
      get(key, fallback) {
        try { const v = getStorage().getItem('limobay.' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
      },
      set(key, value) {
        try { getStorage().setItem('limobay.' + key, JSON.stringify(value)); } catch (e) { /* storage blocked — the page still works */ }
      }
    };
  }
  const store = makeStore(() => window.localStorage);
  const session = makeStore(() => window.sessionStorage);

  // --------------------------------------------------------------------- i18n
  let lang = ['en', 'es'].includes(html.lang) ? html.lang : 'en';
  const VARS = {
    wait: C.freeWaitMin,
    waitPickup: C.freeWaitPickupMin,
    cancel: C.freeCancelHours,
    asap: C.asapLeadMin,
    phone: C.brand.phone,
    brand: C.brand.name,
    returnPct: Math.round(C.pricing.returnDiscount * 100),
    minHours: C.pricing.minHours,
    maxPax: Math.max(...C.vehicles.map((v) => v.pax)),
    airports: C.airports.length,
    year: new Date().getFullYear()
  };

  function t(key, vars) {
    const entry = I18N.strings[key];
    const s = entry ? (entry[lang] != null ? entry[lang] : entry.en) : key;
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : VARS[k] != null ? VARS[k] : m));
  }
  // Pick the current language from a { en, ru, uz } object (or pass a plain string through).
  const loc = (v) => (v == null ? '' : typeof v === 'string' ? v : v[lang] || v.en);

  function applyI18n() {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('.lang-switch [data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $('#copyright').textContent = t('footer.rights');
    document.title = t('meta.title');
    if (typeof fitHeader === 'function') fitHeader();
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    html.lang = next;
    store.set('lang', next);
    applyI18n();
    renderAll();
  }

  // ---------------------------------------------------------- money and time
  // Whole dollars, US style: $1,250.
  const money = (n) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  function duration(min) {
    if (min < 60) return t('time.min', { n: min });
    const h = Math.floor(min / 60);
    const m = Math.round((min % 60) / 5) * 5;
    return m ? t('time.hmin', { h, m }) : t('time.h', { h });
  }
  const miText = (mi) => (mi < 10 ? Math.round(mi * 10) / 10 : Math.round(mi));

  // Every time on the site is local to the selected airport, whatever the visitor's device time zone is.
  const tz = () => airportById(state.airport).tz;
  function nowLocal() {
    return core.localParts(Date.now(), tz());
  }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const x = new Date(Date.UTC(y, m - 1, d + n));
    return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
  }
  const epochOf = (date, time) => core.epochOf(date, time, tz());

  function fmtDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const weekday = I18N.weekdays[lang][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    const month = I18N.months[lang][m - 1];
    const today = nowLocal().date;
    const otherYear = String(y) !== today.slice(0, 4);
    const s = lang === 'es' ? `${d} de ${month}` + (otherYear ? ` de ${y}` : '') : `${month} ${d}` + (otherYear ? `, ${y}` : '');
    if (dateStr === today) return `${t('date.today')}, ${s}`;
    if (dateStr === addDays(today, 1)) return `${t('date.tomorrow')}, ${s}`;
    return `${weekday}, ${s}`;
  }
  // 12-hour clock, as Americans read it: "3:05 PM" / "3:05 p. m."
  function fmtTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = lang === 'es' ? (h < 12 ? 'a. m.' : 'p. m.') : (h < 12 ? 'AM' : 'PM');
    return `${h % 12 || 12}:${pad(m)}\u00a0${suffix}`;
  }
  const fmtDateTime = (date, time) => `${fmtDate(date)} · ${fmtTime(time)}`;
  const fmtCode = (code) => String(code).replace(/^(\d{3})(\d{3})$/, '$1 $2');

  // -------------------------------------------------------------------- state
  function defaultState() {
    return {
      mode: 'from',
      airport: C.airports[0].id,
      place: null,
      addressHint: '',
      when: null,
      date: '',
      hour: '',
      min: '',
      pax: 1,
      bags: 1,
      hours: 3,
      vehicle: null,
      ret: { on: false, date: '', hour: '', min: '' },
      det: {
        who: 'me', name: '', phone: '', via: 'call', email: '', bName: '', bPhone: '',
        flight: '', sign: '', signEdited: false, address: '', comment: '',
        childSeats: 0, assist: false, driverLang: 'any', pay: 'card', promo: ''
      },
      booking: null
    };
  }
  let saved = session.get('state', null);
  // Ignore a saved trip from an older version of the site (unknown airport).
  if (saved && !C.airports.some((a) => a.id === saved.airport)) saved = null;
  const base = defaultState();
  const state = saved ? Object.assign(base, saved, {
    ret: Object.assign(base.ret, saved.ret),
    det: Object.assign(base.det, saved.det)
  }) : base;

  // Remembered contact details from an earlier booking on this device.
  const contact = store.get('contact', null);
  if (contact && !state.det.name && !state.det.phone) {
    Object.assign(state.det, { name: contact.name || '', phone: contact.phone || '', email: contact.email || '', via: contact.via || 'call' });
  }

  const saveState = debounce(() => session.set('state', state), 150);
  const saveStateNow = () => session.set('state', state);

  const airportById = (id) => C.airports.find((a) => a.id === id) || C.airports[0];
  const placeName = (p) => (p ? loc(p.name) : '');

  function points() {
    const ap = airportById(state.airport);
    if (state.mode === 'from') return { from: ap, to: state.place };
    if (state.mode === 'to') return { from: state.place, to: ap };
    return { from: state.place, to: null };
  }

  function quoteFor(vehicleId, oneWayOnly) {
    const p = points();
    return P.quote({
      mode: state.mode, from: p.from, to: p.to, hours: state.hours, vehicleId,
      returnTrip: !oneWayOnly && state.ret.on && state.mode !== 'hourly',
      promo: oneWayOnly ? '' : state.det.promo
    });
  }

  function checkWhen(when, date, hour, min) {
    if (!when) return 'err.when';
    if (when === 'now') return '';
    if (!date) return 'err.date';
    if (hour === '' || min === '') return 'err.time';
    const ts = epochOf(date, `${hour}:${min}`);
    if (ts < Date.now() + 10 * 60000) return 'err.past';
    if (ts > Date.now() + 366 * 86400000) return 'err.tooFar';
    return '';
  }
  const pickupTs = () => (state.when === 'now' ? Date.now() + C.asapLeadMin * 60000 : epochOf(state.date, `${state.hour}:${state.min}`));
  const tripReady = () => !!state.place && !checkWhen(state.when, state.date, state.hour, state.min);
  const vehicleOk = () => {
    const v = P.vehicle(state.vehicle);
    return !!v && P.fits(v, state.pax, state.bags);
  };
  function whenText() {
    return state.when === 'now' ? t('sum.asap') : fmtDateTime(state.date, `${state.hour}:${state.min}`);
  }

  // --------------------------------------------------------------- UI helpers
  function setError(key, msg) {
    const err = $(`#${key}-error`);
    if (err) err.textContent = msg || '';
    const input = { place: '#place-input' }[key] ? $('#place-input') : $(`#${key}`);
    if (input && input.classList.contains('input')) {
      input.classList.toggle('is-invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3800);
  }

  function setChips(container, attr, value) {
    $$(`[data-${attr}]`, container).forEach((b) => {
      const on = b.dataset[attr] === value;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', String(on));
    });
  }

  function fillTimeSelect(select, placeholder) {
    const isHour = select.id.endsWith('hour');
    let opts = `<option value="">${placeholder}</option>`;
    for (let i = 0; i < (isHour ? 24 : 60); i += isHour ? 1 : 5) {
      const label = isHour ? fmtTime(`${pad(i)}:00`).replace(':00', '') : pad(i);
      opts += `<option value="${pad(i)}">${label}</option>`;
    }
    select.innerHTML = opts;
  }

  function scrollToForm(focusSel) {
    const card = $('#trip-form');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusSel) setTimeout(() => { const el = $(focusSel); if (el) el.focus({ preventScroll: true }); }, 450);
  }

  // ---------------------------------------------------------------- trip form
  const TYPE_ICON = { center: 'i-city', hotel: 'i-hotel', station: 'i-train', district: 'i-pin', city: 'i-city', resort: 'i-resort', landmark: 'i-dome', venue: 'i-ticket', port: 'i-ship', airport: 'i-plane', address: 'i-pin' };

  // Alphabetical by city, so people find their airport quickly.
  const airportsByCity = () => C.airports.slice().sort((a, b) => loc(a.city).localeCompare(loc(b.city), lang) || a.id.localeCompare(b.id));

  function renderAirportSelect() {
    const sel = $('#airport-select');
    sel.innerHTML = airportsByCity().map((a) => `<option value="${a.id}">${esc(loc(a.city))} (${a.id})</option>`).join('');
    sel.value = state.airport;
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === 'hourly') state.ret.on = false;
    $$('.trip-tabs [data-mode]').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', String(on));
    });
    $('#route-fields').dataset.mode = mode;
    $('.fld-hours').hidden = mode !== 'hourly';
    updateModeLabels();
    renderWhen();
    saveState();
  }

  function updateModeLabels() {
    const m = state.mode;
    $('#airport-label').textContent = t(m === 'to' ? 'form.airportTo' : 'form.airportFrom');
    $('#place-label').textContent = t(m === 'from' ? 'form.placeTo' : m === 'to' ? 'form.placeFrom' : 'form.placeHourly');
    $('#time-label').textContent = t(m === 'from' ? 'form.timeLanding' : m === 'to' ? 'form.timePickup' : 'form.timeStart');
    $('#to-hint').hidden = m !== 'to';
  }

  function setWhen(w) {
    const today = nowLocal().date;
    state.when = w;
    if (w === 'today') state.date = today;
    else if (w === 'tomorrow') state.date = addDays(today, 1);
    else if (w === 'date' && (!state.date || state.date <= addDays(today, 1))) state.date = '';
    setError('when', '');
    renderWhen();
    saveState();
  }

  function renderWhen() {
    setChips($('.when-chips'), 'when', state.when);
    const now = $('#now-note');
    now.hidden = state.when !== 'now';
    now.textContent = t(state.mode === 'from' ? 'when.nowFrom' : 'when.nowOther');
    $('#when-detail').hidden = !state.when || state.when === 'now';
    $('#fld-date').hidden = state.when !== 'date';
    const today = nowLocal().date;
    const dateInput = $('#trip-date');
    dateInput.min = today;
    dateInput.max = addDays(today, 365);
    dateInput.value = state.when === 'date' ? state.date : '';
    $('#trip-hour').value = state.hour;
    $('#trip-min').value = state.min;
  }

  function renderClock() {
    $('#tz-hint').textContent = t('form.tzHint', { city: loc(airportById(state.airport).city), time: fmtTime(nowLocal().time) });
  }

  // Steppers
  const STEPPERS = {
    pax: { min: 1, max: VARS.maxPax, get: () => state.pax, set: (v) => { state.pax = v; } },
    bags: { min: 0, max: 20, get: () => state.bags, set: (v) => { state.bags = v; } },
    hours: { min: C.pricing.minHours, max: C.pricing.maxHours, get: () => state.hours, set: (v) => { state.hours = v; } },
    childSeats: { min: 0, max: 3, get: () => state.det.childSeats, set: (v) => { state.det.childSeats = v; } }
  };
  function renderStepper(name) {
    const el = $(`[data-stepper="${name}"]`);
    const s = STEPPERS[name];
    const v = s.get();
    el.querySelector('.step-val').textContent = name === 'hours' ? t('form.hoursUnit', { n: v }) : v;
    el.querySelector('[data-step="-1"]').setAttribute('aria-disabled', String(v <= s.min));
    el.querySelector('[data-step="1"]').setAttribute('aria-disabled', String(v >= s.max));
    if (name === 'pax') $('#group-hint').hidden = v < s.max;
  }

  function validateTrip(focus) {
    let first = null;
    setError('place', '');
    setError('when', '');
    if (!state.place) {
      setError('place', t(state.mode === 'from' ? 'err.placeTo' : 'err.placeFrom'));
      first = $('#place-input');
    }
    const w = checkWhen(state.when, state.date, state.hour, state.min);
    if (w) {
      setError('when', t(w));
      if (!first) {
        first = !state.when ? $('.when-chips .chip') : w === 'err.date' ? $('#trip-date') : state.when === 'now' ? $('.when-chips .chip') : $('#trip-hour');
      }
    }
    if (first && focus !== false) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.focus({ preventScroll: true });
    }
    return !first;
  }

  // ------------------------------------------------------------- place picker
  const picker = (function () {
    const input = $('#place-input');
    const pop = $('#place-pop');
    const list = $('#place-list');
    const clearBtn = $('#place-clear');
    let items = [];
    let active = -1;
    let seq = 0;
    let ctrl = null;
    let fallbackShown = false;

    // Lower-case, without accents or apostrophes, so "Malibu" finds "Malibú" and "fishermans" finds "Fisherman's".
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’`´]/g, '').replace(/[^0-9a-z&]+/g, ' ').trim();
    const ref = () => airportById(state.airport);

    function candidates() {
      const list = C.places.slice();
      if (state.mode === 'hourly') {
        C.airports.forEach((a) => list.push({ id: 'ap-' + a.id, type: 'airport', lat: a.lat, lon: a.lon, name: a.name, alias: a.id + ' ' + Object.values(a.city).join(' ') }));
      }
      return list;
    }

    function sub(p) {
      if (p.type === 'address') return p.sub || t('type.address');
      if (p.type === 'airport') return t('type.airport');
      const mi = Math.max(1, Math.round(P.roadMiles(ref(), p)));
      return `${t('type.' + p.type)} · ${t('pick.mi', { mi })}`;
    }

    function popular() {
      const r = ref();
      const all = candidates().map((p) => ({ p, d: P.haversineMiles(r, p) }));
      const near = all.filter((x) => x.d <= 50 && x.p.top).sort((a, b) => a.p.top - b.p.top || a.d - b.d).slice(0, 7).map((x) => x.p);
      const cities = all
        .filter((x) => x.d > 50 && x.d <= 300 && ['city', 'center', 'resort'].includes(x.p.type))
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
        .map((x) => x.p);
      return [{ title: t('pick.popular'), items: near }, { title: t('pick.cities'), items: cities }];
    }

    function nearby() {
      const r = ref();
      return candidates()
        .map((p) => ({ p, d: P.haversineMiles(r, p) }))
        .filter((x) => x.d <= 40 && x.p.type !== 'airport')
        .sort((a, b) => (a.p.type === 'district' ? 0 : 1) - (b.p.type === 'district' ? 0 : 1) || a.d - b.d)
        .slice(0, 12)
        .map((x) => x.p);
    }

    function localSearch(q) {
      const tokens = norm(q).split(' ').filter((x) => x.length >= 2);
      if (!tokens.length) return [];
      const r = ref();
      return candidates()
        .map((p) => {
          const hay = ' ' + norm([p.name.en, p.name.es, p.alias].join(' '));
          let score = 0;
          tokens.forEach((tk) => {
            if (hay.includes(' ' + tk)) score += 2;
            else if (hay.includes(tk)) score += 1;
          });
          return { p, score, d: P.haversineMiles(r, p) };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.d - b.d)
        .slice(0, 8)
        .map((x) => x.p);
    }

    async function onlineSearch(q) {
      if (ctrl) ctrl.abort();
      ctrl = new AbortController();
      const r = ref();
      const b = C.bounds;
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lat=${r.lat}&lon=${r.lon}&bbox=${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}&lang=en`;
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return [];
        const data = await res.json();
        const seen = new Set();
        return (data.features || [])
          .filter((f) => !f.properties.countrycode || f.properties.countrycode === C.countryCode)
          .map((f) => {
            const pr = f.properties || {};
            const [lon, lat] = f.geometry.coordinates;
            const street = [pr.street, pr.housenumber].filter(Boolean).join(' ');
            const name = pr.name || street;
            if (!name) return null;
            const parts = [];
            if (pr.name && street) parts.push(street);
            [pr.district || pr.locality, pr.city || pr.county, pr.state].forEach((x) => { if (x && x !== name && !parts.includes(x)) parts.push(x); });
            return { id: `osm-${pr.osm_type || ''}${pr.osm_id || ''}`, type: 'address', name, sub: parts.join(', '), lat, lon };
          })
          .filter((p) => {
            if (!p) return false;
            const key = p.name + '|' + p.sub;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
      } catch (e) {
        return [];
      } finally {
        clearTimeout(timer);
      }
    }

    function render(groups) {
      items = [];
      let out = '';
      groups.forEach((g) => {
        if (g.note) out += `<li class="combo-note" role="presentation">${esc(g.note)}</li>`;
        if (g.loading) out += `<li class="combo-loading" role="presentation">${esc(g.loading)}</li>`;
        if (!g.items || !g.items.length) return;
        if (g.title) out += `<li class="combo-group" role="presentation">${esc(g.title)}</li>`;
        g.items.forEach((p) => {
          const i = items.push(p) - 1;
          out += `<li role="option" id="place-opt-${i}" data-idx="${i}" aria-selected="false"><span class="opt-icon">${icon(TYPE_ICON[p.type] || 'i-pin')}</span><span class="opt-text"><b>${esc(placeName(p))}</b><small>${esc(sub(p))}</small></span></li>`;
        });
      });
      list.innerHTML = out;
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (out && document.activeElement === input) open();
      else close();
    }

    function open() {
      pop.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function close() {
      pop.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    const search = debounce(async (q) => {
      const mySeq = ++seq;
      const local = localSearch(q);
      fallbackShown = false;
      const groups = [{ title: t('pick.matches'), items: local }];
      if (q.trim().length >= 3 && navigator.onLine !== false) {
        render(groups.concat([{ loading: t('pick.searching') }]));
        const remote = await onlineSearch(q);
        if (mySeq !== seq) return;
        groups.push({ title: t('pick.addresses'), items: remote });
      }
      if (!groups.some((g) => g.items.length)) {
        fallbackShown = true;
        render([{ note: t('pick.none') }, { title: t('pick.nearby'), items: nearby() }]);
      } else {
        render(groups);
      }
    }, 250);

    function refresh() {
      const q = input.value.trim();
      if (!q || (state.place && q === placeName(state.place))) {
        seq++;
        fallbackShown = false;
        render(popular());
      } else {
        search(q);
      }
    }

    function move(delta) {
      if (!items.length) return;
      active = (active + delta + items.length) % items.length;
      $$('[role="option"]', list).forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.idx) === active)));
      const li = $(`#place-opt-${active}`);
      input.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    }

    function select(i) {
      const p = items[i];
      if (!p) return;
      seq++;
      const typed = input.value.trim();
      // The user typed an address we could not find and then chose an area: keep their words for the driver.
      if (fallbackShown && typed) state.addressHint = typed;
      state.place = { id: p.id, type: p.type, name: p.name, sub: p.sub || '', lat: p.lat, lon: p.lon };
      input.value = placeName(p);
      clearBtn.hidden = false;
      close();
      setError('place', '');
      saveState();
    }

    input.addEventListener('focus', () => {
      if (state.place) input.select();
      refresh();
    });
    input.addEventListener('input', () => {
      if (state.place && input.value !== placeName(state.place)) {
        state.place = null;
        saveState();
      }
      clearBtn.hidden = !input.value;
      refresh();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (pop.hidden) refresh(); else move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && !pop.hidden && items.length) {
        if (active >= 0 || !fallbackShown) { e.preventDefault(); select(active >= 0 ? active : 0); }
      } else if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); close(); }
    });
    input.addEventListener('blur', () => setTimeout(close, 150));
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => {
      const li = e.target.closest('[role="option"]');
      if (li) select(Number(li.dataset.idx));
    });
    clearBtn.addEventListener('click', () => {
      input.value = '';
      state.place = null;
      clearBtn.hidden = true;
      saveState();
      input.focus();
    });

    return {
      sync() {
        input.value = placeName(state.place);
        clearBtn.hidden = !input.value;
        if (!pop.hidden) refresh();
      }
    };
  })();

  // ------------------------------------------------------------- home sections
  const carPhoto = (v, lazy) => `<img src="img/fleet/${v.id}.webp" alt="" width="1200" height="700"${lazy ? ' loading="lazy"' : ''} decoding="async">`;

  function renderFleet() {
    $('#fleet-grid').innerHTML = C.vehicles.map((v) => `
      <article class="fleet-card">
        <div class="fleet-photo">${carPhoto(v, true)}</div>
        <div class="fleet-body">
          <div class="fleet-top">
            <h3>${t('car.' + v.id)}</h3>
            <span class="fleet-seats">${t('fleet.seats', { n: v.pax })}</span>
          </div>
          <p class="car-models">${esc(v.models)} ${t('car.orSimilar')}</p>
          <div class="car-cap">
            <span title="${esc(t('cap.pax', { n: v.pax }))}">${icon('i-users')}${v.pax}<span class="sr-only"> — ${esc(t('cap.pax', { n: v.pax }))}</span></span>
            <span title="${esc(t('cap.bags', { n: v.bags }))}">${icon('i-luggage')}${v.bags}<span class="sr-only"> — ${esc(t('cap.bags', { n: v.bags }))}</span></span>
          </div>
          <ul class="car-feats">
            <li>${icon('i-check')}${t(`car.${v.id}.f1`)}</li>
            <li>${icon('i-check')}${t(`car.${v.id}.f2`)}</li>
            <li>${icon('i-check')}${t('fleet.hour', { price: money(v.hour) })}</li>
          </ul>
          <div class="fleet-foot">
            <span class="fleet-price"><small>${t('fleet.fromLabel')}</small><b>${money(v.min)}</b><small>${t('fleet.cityNote')}</small></span>
            <button type="button" class="btn btn-outline" data-action="pick-vehicle" data-vehicle="${v.id}">${t('fleet.choose')}</button>
          </div>
        </div>
      </article>`).join('');
    updateCarousel();
  }

  // Arrows show only when there is more to scroll to.
  function updateCarousel() {
    const track = $('#fleet-grid');
    const max = track.scrollWidth - track.clientWidth - 4;
    $('.carousel-btn.prev').disabled = track.scrollLeft <= 4;
    $('.carousel-btn.next').disabled = track.scrollLeft >= max;
  }

  function scrollCarousel(dir) {
    const track = $('#fleet-grid');
    const card = track.querySelector('.fleet-card');
    if (!card) return;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16);
    track.scrollBy({ left: dir * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function renderRoutes() {
    $('#routes-grid').innerHTML = C.popularRoutes.map((r, i) => {
      const ap = airportById(r.airport);
      const pl = C.places.find((p) => p.id === r.place);
      if (!pl) return '';
      const mi = P.roadMiles(ap, pl);
      const price = P.tripPrice(C.vehicles[0], mi);
      return `<button type="button" class="route-card" data-route="${i}">
        <span class="route-top"><span class="code-badge">${icon('i-plane')}${ap.id}</span>${esc(loc(ap.city))}</span>
        <span class="route-title">${esc(placeName(pl))}</span>
        <span class="route-meta">${t('route.meta', { mi: Math.round(mi), time: duration(P.estimateMinutes(mi)) })}</span>
        <span class="route-bottom">
          <span class="route-price">${t('fleet.from', { price: money(price) })}<small>${esc(t('car.' + C.vehicles[0].id))}</small></span>
          <span class="route-go">${icon('i-arrow-right')}</span>
        </span>
      </button>`;
    }).join('');
  }

  function renderAirports() {
    $('#airports-grid').innerHTML = airportsByCity().map((a) => `
      <button type="button" class="airport-card" data-airport="${a.id}">
        <span class="airport-code">${a.id}</span>
        <span class="airport-text"><b>${esc(loc(a.city))}</b><small>${esc(loc(a.name))}</small></span>
        ${icon('i-chevron-right')}
      </button>`).join('');
  }

  function renderReviews() {
    $('#reviews-grid').innerHTML = C.reviews.map((r) => `
      <figure class="review">
        <div class="stars" role="img" aria-label="5 / 5">${icon('i-star').repeat(5)}</div>
        <blockquote lang="${esc(r.lang)}">${esc(r.text)}</blockquote>
        <figcaption class="review-who"><span class="avatar" aria-hidden="true">${esc(r.name.charAt(0))}</span><span><b>${esc(r.name)}</b><small>${esc(r.from)}</small></span></figcaption>
      </figure>`).join('');
  }

  // ------------------------------------------------------------------- routing
  let pendingScroll = null;

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    closeMenu();
    const h = location.hash || '#/';
    if (h.startsWith('#/book')) return showStep('car');
    if (h.startsWith('#/details')) return showStep('details');
    if (h.startsWith('#/done')) return showStep('done');
    return showHome(h);
  }

  function showHome(h) {
    const wasHidden = $('#view-home').hidden;
    $('#view-home').hidden = false;
    $('#view-book').hidden = true;
    document.body.classList.add('on-home');
    const target = /^#[a-z][\w-]*$/i.test(h) ? document.getElementById(h.slice(1)) : null;
    if (target) {
      target.scrollIntoView();
    } else if (pendingScroll) {
      const focusSel = pendingScroll;
      requestAnimationFrame(() => scrollToForm(focusSel === true ? null : focusSel));
    } else if (wasHidden) {
      window.scrollTo(0, 0);
    }
    pendingScroll = null;
  }

  const STEP_INDEX = { car: 2, details: 3, done: 4 };

  function showStep(step, soft) {
    if (step === 'done') {
      if (!state.booking) return location.replace('#/');
    } else if (!tripReady()) {
      pendingScroll = true;
      location.replace('#/');
      setTimeout(() => validateTrip(false), 50);
      return;
    } else if (step === 'details' && !vehicleOk()) {
      return location.replace('#/book');
    }

    $('#view-home').hidden = true;
    $('#view-book').hidden = false;
    document.body.classList.remove('on-home');
    ['car', 'details', 'done'].forEach((s) => { $('#step-' + s).hidden = s !== step; });

    const idx = STEP_INDEX[step];
    $$('.progress li').forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-done', n < idx || step === 'done');
      li.classList.toggle('is-current', n === idx && step !== 'done');
      if (n === idx) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    $('#back-link').hidden = step === 'done';
    $('#book-aside').hidden = step === 'done';

    if (step === 'car') renderCars();
    if (step === 'details') renderDetails();
    if (step === 'done') renderDone();
    if (step !== 'done') {
      renderSummary();
      renderTripLine();
    } else {
      $('#trip-line').innerHTML = '';
    }

    if (soft) return;
    window.scrollTo(0, 0);
    const title = $({ car: '#car-title', details: '#det-title', done: '#done-title' }[step]);
    if (title) title.focus({ preventScroll: true });
  }

  function currentStep() {
    if ($('#view-book').hidden) return null;
    return ['car', 'details', 'done'].find((s) => !$('#step-' + s).hidden) || null;
  }

  // ---------------------------------------------------------- route & the map
  const routeCache = new Map();
  const routeKey = (a, b) => [a.lat, a.lon, b.lat, b.lon].map((n) => Number(n).toFixed(4)).join(',');

  function routeInfo(a, b) {
    const key = routeKey(a, b);
    if (!routeCache.has(key)) {
      const mi = P.roadMiles(a, b);
      const info = { mi, min: P.estimateMinutes(mi), coords: null };
      routeCache.set(key, info);
      fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=simplified&geometries=geojson`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const r0 = d && d.routes && d.routes[0];
          if (!r0) return;
          info.mi = r0.distance / 1609.344;
          // Free routing has no traffic data; real city traffic is slower than the ideal.
          info.min = Math.max(5, Math.round((r0.duration / 60) * 1.3 / 5) * 5);
          info.coords = r0.geometry.coordinates.map(([lo, la]) => [la, lo]);
          const p = points();
          if (p.from && p.to && routeKey(p.from, p.to) === key && currentStep() && currentStep() !== 'done') {
            renderSummary();
          }
        })
        .catch(() => { /* offline: keep the estimate */ });
    }
    return routeCache.get(key);
  }

  let leafletPromise = null;
  let map = null;
  let mapLayer = null;
  let mapKey = '';

  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (!leafletPromise) {
      leafletPromise = new Promise((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        css.crossOrigin = '';
        document.head.appendChild(css);
        const js = document.createElement('script');
        js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        js.crossOrigin = '';
        js.onload = () => resolve(window.L);
        js.onerror = () => { leafletPromise = null; reject(new Error('leaflet')); };
        document.head.appendChild(js);
      });
    }
    return leafletPromise;
  }

  async function drawMap() {
    const box = $('#map-box');
    const p = points();
    if (!p.from) { box.classList.add('no-map'); return; }
    let Lf;
    try { Lf = await loadLeaflet(); } catch (e) { box.classList.add('no-map'); return; }
    if ($('#book-aside').hidden) return;
    box.classList.remove('no-map');
    if (!map) {
      map = Lf.map('map', { zoomControl: false, scrollWheelZoom: false, dragging: !Lf.Browser.mobile, tap: false });
      Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      mapLayer = Lf.layerGroup().addTo(map);
    }
    map.invalidateSize();
    const info = p.to ? routeInfo(p.from, p.to) : null;
    const key = (p.to ? routeKey(p.from, p.to) : String(p.from.lat) + p.from.lon) + (info && info.coords ? ':live' : '');
    if (key === mapKey) return;
    mapKey = key;
    mapLayer.clearLayers();
    const pin = (letter, cls) => Lf.divIcon({ className: '', html: `<div class="pin ${cls}"><span>${letter}</span></div>`, iconSize: [32, 32], iconAnchor: [16, 38] });
    const a = [p.from.lat, p.from.lon];
    Lf.marker(a, { icon: pin('A', 'pin-a'), keyboard: false }).addTo(mapLayer);
    if (p.to) {
      const b = [p.to.lat, p.to.lon];
      Lf.marker(b, { icon: pin('B', 'pin-b'), keyboard: false }).addTo(mapLayer);
      const line = info.coords || [a, b];
      Lf.polyline(line, { color: '#0E8794', weight: 5, opacity: 0.85, dashArray: info.coords ? null : '8 10' }).addTo(mapLayer);
      map.fitBounds(Lf.latLngBounds(line.concat([a, b])), { padding: [36, 36] });
    } else {
      map.setView(a, 13);
    }
  }

  // ---------------------------------------------------------------- summary
  function renderSummary() {
    const ap = airportById(state.airport);
    const placeSub = (pl) => (pl && pl.type === 'address' ? pl.sub : pl ? t('type.' + pl.type) : '');
    const pt = (letter, name, subText) => `<div class="sr-point"><span class="sr-dot ${letter.toLowerCase()}">${letter}</span><span class="sr-text"><b>${esc(name)}</b><small>${esc(subText)}</small></span></div>`;
    const apName = loc(ap.name);
    const apSub = `${loc(ap.city)} · ${ap.id}`;
    let route;
    if (state.mode === 'from') route = pt('A', apName, apSub) + pt('B', placeName(state.place), placeSub(state.place));
    else if (state.mode === 'to') route = pt('A', placeName(state.place), placeSub(state.place)) + pt('B', apName, apSub);
    else route = pt('A', placeName(state.place), placeSub(state.place)) + pt('B', t('form.hoursUnit', { n: state.hours }), t('mode.hourly'));
    $('#summary-route').innerHTML = route;

    const rows = [[t('sum.when'), esc(whenText())]];
    rows.push([t('sum.people'), `${icon('i-users')} ${state.pax} &nbsp; ${icon('i-luggage')} ${state.bags}`]);
    const p = points();
    if (p.to) {
      const info = routeInfo(p.from, p.to);
      rows.push([t('sum.distance'), esc(t('sum.roadTime', { mi: miText(info.mi), time: duration(info.min) }))]);
    }
    if (state.vehicle) rows.push([t('sum.car'), esc(t('car.' + state.vehicle))]);
    if (state.ret.on && state.ret.date && state.ret.hour && state.ret.min) rows.push([t('sum.return'), esc(fmtDateTime(state.ret.date, `${state.ret.hour}:${state.ret.min}`))]);

    let price = `<p class="sum-empty">${t('sum.noCar')}</p>`;
    if (vehicleOk()) {
      const q = quoteFor(state.vehicle);
      let lines = '';
      if (q.returnPrice || q.discount) {
        lines += `<div class="sum-line"><span>${t('sum.oneWay')}</span><span>${money(q.oneWay)}</span></div>`;
        if (q.returnPrice) lines += `<div class="sum-line"><span>${t('sum.returnLine')}</span><span>${money(q.returnPrice)}</span></div>`;
        if (q.discount) lines += `<div class="sum-line discount"><span>${t('sum.promoLine', { code: esc(q.promo) })}</span><span>−${money(q.discount)}</span></div>`;
      }
      price = `${lines}<div class="sum-total"><span>${t('common.total')}</span><b>${money(q.total)}</b></div>`;
    }

    const inc = state.mode === 'from'
      ? ['inc.sign', 'inc.waitFrom', 'inc.flight', 'inc.allIn', 'inc.cancel', 'inc.seats', 'inc.pay']
      : ['inc.door', 'inc.waitTo', 'inc.allIn', 'inc.cancel', 'inc.seats', 'inc.pay'];

    $('#summary-body').innerHTML = `
      <dl class="sum-list">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <div class="sum-price">${price}</div>
      <div class="includes"><h3>${t('sum.includes')}</h3><ul>${inc.map((k) => `<li>${icon('i-check')}<span>${t(k)}</span></li>`).join('')}</ul></div>
      <button type="button" class="btn btn-secondary btn-block" data-action="edit-trip">${icon('i-edit')}<span>${t('sum.change')}</span></button>`;
    drawMap();
  }

  function renderTripLine() {
    const ap = airportById(state.airport);
    const a = state.mode === 'from' ? `${loc(ap.city)} (${ap.id})` : placeName(state.place);
    const b = state.mode === 'from' ? placeName(state.place) : state.mode === 'to' ? `${loc(ap.city)} (${ap.id})` : t('form.hoursUnit', { n: state.hours });
    $('#trip-line').innerHTML = `<span class="tl-text">${esc(a)} → ${esc(b)}<small>${esc(whenText())} · ${state.pax} ${icon('i-users')} · ${state.bags} ${icon('i-luggage')}</small></span>
      <button type="button" class="btn btn-secondary" data-action="edit-trip" aria-label="${esc(t('sum.change'))}">${icon('i-edit')}<span>${t('common.change')}</span></button>`;
  }

  function updateTotals() {
    const out = vehicleOk() ? quoteFor(state.vehicle) : null;
    const text = out ? money(out.total) : '—';
    $('#car-total').innerHTML = text;
    $('#details-total').innerHTML = text;
  }

  // ------------------------------------------------------------------ car step
  function renderCars() {
    const prices = {};
    C.vehicles.forEach((v) => { prices[v.id] = quoteFor(v.id, true).oneWay; });
    const fitting = C.vehicles.filter((v) => P.fits(v, state.pax, state.bags));
    if (state.vehicle && !fitting.some((v) => v.id === state.vehicle)) state.vehicle = null;
    const best = fitting.slice().sort((a, b) => prices[a.id] - prices[b.id])[0];
    const ordered = fitting.concat(C.vehicles.filter((v) => !fitting.includes(v)));

    $('#car-list').innerHTML = ordered.map((v) => {
      const fit = fitting.includes(v);
      const selected = state.vehicle === v.id;
      let badge = '';
      if (fit && best && best.id === v.id) badge = `<span class="badge badge-gold">${t('car.best')}</span>`;
      else if (fit && v.popular) badge = `<span class="badge badge-turq">${t('car.popular')}</span>`;
      const reason = !fit ? (state.pax > v.pax ? t('car.noFitPax', { n: state.pax }) : t('car.noFitBags', { n: state.bags })) : '';
      return `<button type="button" role="radio" class="car-card" data-vehicle="${v.id}" aria-checked="${selected}"${fit ? '' : ' aria-disabled="true"'}>
        <span class="car-art">${carPhoto(v)}</span>
        <span class="car-info">
          <span class="car-name">${t('car.' + v.id)} ${badge}</span>
          <span class="car-models">${esc(v.models)} ${t('car.orSimilar')}</span>
          <span class="car-cap">
            <span>${icon('i-users')}${v.pax}<span class="sr-only"> — ${esc(t('cap.pax', { n: v.pax }))}</span></span>
            <span>${icon('i-luggage')}${v.bags}<span class="sr-only"> — ${esc(t('cap.bags', { n: v.bags }))}</span></span>
          </span>
          <span class="car-feats"><span>${icon('i-check')}${t(`car.${v.id}.f1`)}</span><span>${icon('i-check')}${t(`car.${v.id}.f2`)}</span></span>
          ${reason ? `<span class="car-nofit">${esc(reason)}</span>` : ''}
        </span>
        <span class="car-price">
          <span class="car-price-amount"><b>${money(prices[v.id])}</b></span>
          <span class="car-pick">${selected ? icon('i-check') + t('car.selected') : t('car.choose')}</span>
        </span>
      </button>`;
    }).join('');
    $('#car-error').textContent = '';
    renderReturn();
    updateTotals();
  }

  function selectVehicle(id) {
    state.vehicle = id;
    $$('#car-list .car-card').forEach((card) => {
      const on = card.dataset.vehicle === id;
      card.setAttribute('aria-checked', String(on));
      card.querySelector('.car-pick').innerHTML = on ? icon('i-check') + t('car.selected') : t('car.choose');
    });
    $('#car-error').textContent = '';
    updateTotals();
    renderSummary();
    saveState();
  }

  function renderReturn() {
    const hourly = state.mode === 'hourly';
    $('#return-panel').hidden = hourly;
    if (hourly) return;
    $('#return-toggle').checked = state.ret.on;
    $('#return-fields').hidden = !state.ret.on;
    $('#return-label').textContent = t(state.mode === 'from' ? 'car.returnTo' : 'car.returnFrom');
    const minDate = state.when === 'now' ? nowLocal().date : state.date;
    const d = $('#return-date');
    d.min = minDate;
    d.max = addDays(nowLocal().date, 365);
    d.value = state.ret.date;
    $('#return-hour').value = state.ret.hour;
    $('#return-min').value = state.ret.min;
  }

  function validateReturn() {
    const r = state.ret;
    setError('return', '');
    if (!r.on || state.mode === 'hourly') return true;
    let msg = '';
    if (!r.date || r.hour === '' || r.min === '') msg = t('err.returnWhen');
    else if (epochOf(r.date, `${r.hour}:${r.min}`) < pickupTs() + 3600000) msg = t('err.returnTime');
    if (msg) {
      setError('return', msg);
      $('#return-date').focus();
      return false;
    }
    return true;
  }

  // -------------------------------------------------------------- details step
  function renderDetails() {
    const d = state.det;
    setChips($('#who-chips'), 'who', d.who);
    setChips($('#via-chips'), 'via', d.via);
    $('#booker-panel').hidden = d.who !== 'other';
    $('#pax-title').textContent = t(d.who === 'other' ? 'det.paxOther' : 'det.paxMe');
    $('#p-phone-hint').textContent = t(d.who === 'other' ? 'det.phoneHintOther' : 'det.phoneHint');

    if (!d.address && state.addressHint) d.address = state.addressHint;
    const values = { 'p-name': d.name, 'p-phone': d.phone, 'p-email': d.email, 'b-name': d.bName, 'b-phone': d.bPhone, flight: d.flight, sign: d.sign || d.name, address: d.address, comment: d.comment, promo: d.promo };
    Object.keys(values).forEach((id) => { $('#' + id).value = values[id] || ''; });
    $('#assist').checked = d.assist;
    $('#driver-lang').value = d.driverLang;
    $$('input[name="pay"]').forEach((r) => { r.checked = r.value === d.pay; });
    renderStepper('childSeats');

    $('#fld-flight').hidden = state.mode === 'hourly';
    $('#flight-opt').textContent = t(state.mode === 'from' ? 'common.recommended' : 'common.optional');
    $('#flight-hint').textContent = t(state.mode === 'from' ? 'det.flightHintFrom' : 'det.flightHintTo');
    $('#fld-sign').hidden = state.mode !== 'from';
    $('#address-label-text').textContent = t(state.mode === 'from' ? 'det.addressTo' : 'det.addressPickup');
    $('#details-alert').hidden = true;
    renderPromoMsg();
    updateTotals();
  }

  function renderPromoMsg() {
    const msg = $('#promo-msg');
    const rate = P.promoRate(state.det.promo);
    msg.className = 'field-msg' + (state.det.promo ? (rate ? ' ok' : ' bad') : '');
    msg.textContent = state.det.promo ? (rate ? t('det.promoOk', { pct: Math.round(rate * 100) }) : t('det.promoBad')) : '';
    if (rate) $('#promo-details').open = true;
  }

  function validateDetails() {
    const d = state.det;
    let first = null;
    const check = (id, ok, key) => {
      const el = $('#' + id);
      setError(id, ok ? '' : t(key));
      if (!ok && !first) first = el;
    };
    check('p-name', d.name.trim().length >= 2, 'err.name');
    check('p-phone', !!core.normPhone(d.phone), 'err.phone');
    check('p-email', !d.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()), 'err.email');
    if (d.who === 'other') {
      check('b-name', d.bName.trim().length >= 2, 'err.name');
      check('b-phone', !!core.normPhone(d.bPhone), 'err.phone');
    } else {
      setError('b-name', '');
      setError('b-phone', '');
    }
    if (state.mode !== 'hourly') check('flight', !d.flight.trim() || /^[A-Z0-9]{2,3}[\s-]?\d{1,4}[A-Z]?$/i.test(d.flight.trim()), 'err.flight');
    const alert = $('#details-alert');
    alert.hidden = !first;
    alert.textContent = first ? t('err.fixAbove') : '';
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.focus({ preventScroll: true });
    }
    return !first;
  }

  function buildPayload() {
    const d = state.det;
    const pl = state.place;
    return {
      mode: state.mode,
      airport: state.airport,
      place: { id: pl.id, type: pl.type, name: placeName(pl), sub: pl.sub || '', lat: pl.lat, lon: pl.lon },
      when: state.when === 'now' ? { asap: true } : { asap: false, date: state.date, time: `${state.hour}:${state.min}` },
      pax: state.pax,
      bags: state.bags,
      hours: state.hours,
      vehicle: state.vehicle,
      ret: state.ret.on && state.mode !== 'hourly' ? { date: state.ret.date, time: `${state.ret.hour}:${state.ret.min}` } : null,
      passenger: { name: d.name.trim(), phone: core.normPhone(d.phone) },
      booker: d.who === 'other' ? { name: d.bName.trim(), phone: core.normPhone(d.bPhone) } : null,
      via: d.via,
      email: d.email.trim(),
      flight: state.mode === 'hourly' ? '' : d.flight.trim().toUpperCase(),
      sign: state.mode === 'from' ? (d.sign || d.name).trim() : '',
      address: d.address.trim(),
      comment: d.comment.trim(),
      childSeats: d.childSeats,
      assist: d.assist,
      driverLang: d.driverLang,
      pay: d.pay,
      promo: P.promoRate(d.promo) ? d.promo : '',
      lang
    };
  }

  const SERVER_FIELDS = { place: null, when: null, vehicle: null, ret: 'return-date', 'p-name': 'p-name', 'p-phone': 'p-phone', 'b-name': 'b-name', 'b-phone': 'b-phone', 'p-email': 'p-email', flight: 'flight' };
  let submitting = false;

  async function submitBooking() {
    if (submitting) return;
    if (!validateDetails()) return;
    if (!tripReady() || !vehicleOk()) return go('#/');
    const btn = $('#confirm-btn');
    const label = btn.innerHTML;
    submitting = true;
    btn.disabled = true;
    btn.innerHTML = `<span class="spin" aria-hidden="true"></span><span>${t('common.sending')}</span>`;
    const alert = $('#details-alert');
    alert.hidden = true;
    try {
      const res = await api.createBooking(buildPayload());
      if ($('#remember').checked) {
        const d = state.det;
        const me = d.who === 'other' ? { name: d.bName, phone: d.bPhone } : { name: d.name, phone: d.phone };
        store.set('contact', { name: me.name.trim(), phone: me.phone.trim(), email: d.email.trim(), via: d.via });
      }
      state.booking = Object.assign({}, res.booking, { demo: !!res.demo });
      // Clear the trip so the browser's Back button cannot submit the same booking twice.
      Object.assign(state, { when: null, date: '', hour: '', min: '', vehicle: null, addressHint: '' });
      state.ret = { on: false, date: '', hour: '', min: '' };
      Object.assign(state.det, { flight: '', sign: '', signEdited: false, address: '', comment: '', promo: '', childSeats: 0, assist: false });
      saveStateNow();
      location.replace('#/done/' + res.booking.code);
    } catch (err) {
      const field = err && err.data && err.data.field;
      if (field && SERVER_FIELDS[field]) setError(SERVER_FIELDS[field], t('err.fixAbove'));
      alert.hidden = false;
      alert.innerHTML = esc(t('err.network')).replace(esc(C.brand.phone), `<a href="tel:${esc(C.brand.phoneHref)}">${esc(C.brand.phone)}</a>`);
      alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitting = false;
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  // ----------------------------------------------------------------- done step
  function bookingRoute(b) {
    const ap = C.airports.find((a) => a.id === b.airport);
    const apText = ap ? `${loc(ap.city)} (${ap.id})` : '';
    if (b.mode === 'from') return `${apText} → ${b.place.name}`;
    if (b.mode === 'to') return `${b.place.name} → ${apText}`;
    return `${b.place.name} · ${t('form.hoursUnit', { n: b.hours })}`;
  }
  const bookingWhen = (b) => (b.asap ? t('sum.asap') : fmtDateTime(b.date, b.time));
  const PAY_KEYS = { cash: 'pay.cash', card: 'pay.card', app: 'pay.app' };

  function bookingRows(b) {
    const rows = [
      [t('sum.title'), esc(bookingRoute(b))],
      [t('sum.when'), esc(bookingWhen(b))],
      [t('sum.car'), `${esc(t('car.' + b.vehicle))} · ${icon('i-users')} ${b.pax} ${icon('i-luggage')} ${b.bags}`]
    ];
    if (b.ret) rows.push([t('sum.return'), esc(fmtDateTime(b.ret.date, b.ret.time))]);
    rows.push([t('done.passenger'), `${esc(b.passenger.name)}<br>${esc(core.fmtPhone(b.passenger.phone))}`]);
    if (b.booker) rows.push([t('det.booker'), `${esc(b.booker.name)}<br>${esc(core.fmtPhone(b.booker.phone))}`]);
    if (b.flight) rows.push([t('det.flight'), esc(b.flight)]);
    if (b.sign) rows.push([t('det.sign'), esc(b.sign)]);
    if (b.address) rows.push([t(b.mode === 'from' ? 'det.addressTo' : 'det.addressPickup'), esc(b.address)]);
    const extras = [];
    if (b.childSeats) extras.push(`${t('det.childSeat')} × ${b.childSeats}`);
    if (b.assist) extras.push(t('det.assist'));
    if (b.driverLang && b.driverLang !== 'any') extras.push(`${t('det.lang')}: ${t({ en: 'det.langEn', es: 'det.langEs' }[b.driverLang])}`);
    if (extras.length) rows.push([t('det.extras'), esc(extras.join(', '))]);
    if (b.comment) rows.push([t('det.comment'), esc(b.comment)]);
    rows.push([t('done.payment'), esc(t(PAY_KEYS[b.pay] || 'pay.card'))]);
    rows.push([t('done.price'), `<b>${money(b.price.total)}</b>`]);
    return rows;
  }
  const kv = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

  function renderDone() {
    const b = state.booking;
    $('#done-code').textContent = fmtCode(b.code);
    $('#done-demo').hidden = !b.demo;
    const n3 = b.mode === 'from'
      ? [t('done.n3tFrom'), t('done.n3From', { sign: b.sign || b.passenger.name })]
      : [t('done.n3tTo'), t('done.n3To')];
    $('#next-list').innerHTML = [
      [t('done.n1t'), t('done.n1')],
      [t(b.asap ? 'done.n2tAsap' : 'done.n2t'), t('done.n2')],
      n3
    ].map(([title, text]) => `<li><b>${esc(title)}</b><span>${esc(text)}</span></li>`).join('');
    $('#done-summary').innerHTML = `<h2 class="panel-title">${t('done.details')}</h2>${kv(bookingRows(b))}`;
    $('#done-return').hidden = b.mode === 'hourly' || !!b.ret;
  }

  function icsFile(b) {
    const stamp = (ts) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escIcs = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const ap = C.airports.find((a) => a.id === b.airport);
    const minutes = b.mode === 'hourly' ? b.hours * 60 : P.estimateMinutes(b.price.mi || 10);
    const event = (uid, start, from, title) => [
      'BEGIN:VEVENT',
      `UID:${uid}@limobay`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(start + minutes * 60000)}`,
      `SUMMARY:${escIcs(title)}`,
      `LOCATION:${escIcs(from)}`,
      `DESCRIPTION:${escIcs(`${C.brand.name} №${fmtCode(b.code)}\n${bookingRoute(b)}\n${t('car.' + b.vehicle)} · ${money(b.price.total)}\n${C.brand.phone}`)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(title)}`, 'END:VALARM',
      'END:VEVENT'
    ];
    const apName = ap ? loc(ap.name) : '';
    const outFrom = b.mode === 'from' ? apName : b.place.name;
    let lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LimoBay//Airport rides//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    lines = lines.concat(event(b.code, Date.parse(b.pickupAt), outFrom, `${C.brand.name}: ${bookingRoute(b)}`));
    if (b.ret) {
      const retFrom = b.mode === 'from' ? b.place.name : apName;
      lines = lines.concat(event(b.code + '-r', Date.parse(b.ret.pickupAt), retFrom, `${C.brand.name}: ${t('sum.return')}`));
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function downloadIcs() {
    const b = state.booking;
    if (!b) return;
    const url = URL.createObjectURL(new Blob([icsFile(b)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `limobay-${b.code}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Native share sheet on phones; elsewhere copy the details to the clipboard.
  async function shareBooking() {
    const b = state.booking;
    if (!b) return;
    const text = t('done.shareText', { code: fmtCode(b.code), route: bookingRoute(b), when: bookingWhen(b) });
    const url = STATIC_DEMO ? location.href.split('#')[0] : C.brand.siteUrl;
    if (navigator.share) {
      try { await navigator.share({ title: C.brand.name, text, url }); } catch (e) { /* share sheet closed */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast(t('common.copied'));
    } catch (e) {
      window.prompt(t('done.share'), `${text} ${url}`);
    }
  }

  function bookReturn() {
    const b = state.booking;
    if (!b) return;
    state.mode = b.mode === 'from' ? 'to' : 'from';
    state.airport = b.airport || state.airport;
    state.place = { id: b.place.id, type: b.place.type, name: b.place.name, sub: b.place.sub, lat: b.place.lat, lon: b.place.lon };
    state.vehicle = b.vehicle;
    state.pax = b.pax;
    state.bags = b.bags;
    saveStateNow();
    syncTripForm();
    pendingScroll = '.when-chips .chip';
    go('#/');
  }

  // --------------------------------------------------------------------- API
  // Static hosting (GitHub Pages) or opened as a file: there is no server, so bookings stay in this browser.
  // On localhost without the server the same fallback kicks in after the first failed request.
  const STATIC_DEMO = location.protocol === 'file:' || /(^|\.)github\.io$/.test(location.hostname);
  const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let demoMode = STATIC_DEMO;

  async function request(method, url, body) {
    if (demoMode) throw { demo: true };
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      if (LOCAL_HOST) { demoMode = true; throw { demo: true }; }
      throw { network: true };
    }
    if (!res.headers.get('X-LimoBay-Api') && LOCAL_HOST) { demoMode = true; throw { demo: true }; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, data };
    return data;
  }

  const demo = {
    all: () => store.get('demoBookings', []),
    save: (list) => store.set('demoBookings', list.slice(-50)),
    create(payload) {
      const r = core.normalize(payload);
      if (r.error) throw { status: 400, data: r };
      const list = demo.all();
      const b = Object.assign({ code: core.newCode((c) => list.some((x) => x.code === c)), createdAt: new Date().toISOString() }, r.booking);
      list.push(b);
      demo.save(list);
      return b;
    },
    find(code, phone) {
      const b = demo.all().find((x) => x.code === code);
      return b && core.phoneMatches(b, phone) ? b : null;
    },
    cancel(code, phone) {
      const list = demo.all();
      const b = list.find((x) => x.code === code);
      if (!b || !core.phoneMatches(b, phone)) throw { status: 404 };
      if (!core.canCancel(b)) throw { status: 409, data: { error: 'too_late' } };
      b.status = 'cancelled';
      demo.save(list);
      return b;
    }
  };

  const api = {
    async createBooking(payload) {
      try {
        const d = await request('POST', '/api/bookings', payload);
        return { booking: d.booking, demo: false };
      } catch (e) {
        if (e.demo) return { booking: demo.create(payload), demo: true };
        throw e;
      }
    },
    async findBooking(code, phone) {
      try {
        return (await request('GET', `/api/bookings/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`)).booking;
      } catch (e) {
        if (!e.demo) throw e;
        const b = demo.find(code, phone);
        if (!b) throw { status: 404 };
        return b;
      }
    },
    async cancelBooking(code, phone) {
      try {
        return (await request('POST', `/api/bookings/${encodeURIComponent(code)}/cancel`, { phone })).booking;
      } catch (e) {
        if (e.demo) return demo.cancel(code, phone);
        throw e;
      }
    },
    async callback(payload) {
      try {
        return await request('POST', '/api/callback', payload);
      } catch (e) {
        if (e.demo) return { ok: true, demo: true };
        throw e;
      }
    }
  };

  // ------------------------------------------------------------------ dialogs
  function openDialog(id) {
    const dlg = $(id);
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    return dlg;
  }

  function openManage() {
    const dlg = openDialog('#dlg-manage');
    $('#manage-form').hidden = false;
    $('#manage-result').hidden = true;
    $('#manage-error').textContent = '';
    if (!$('#m-code').value && state.booking) $('#m-code').value = fmtCode(state.booking.code);
    if (!$('#m-phone').value && contact) $('#m-phone').value = contact.phone || '';
    setTimeout(() => (($('#m-code').value ? $('#m-phone') : $('#m-code')).focus()), 50);
    return dlg;
  }

  function renderManage(b) {
    const phone = core.normPhone($('#m-phone').value);
    const result = $('#manage-result');
    const cancellable = core.canCancel(b);
    const active = ['new', 'confirmed', 'assigned'].includes(b.status);
    result.innerHTML = `<div class="manage-card">
      <p><span class="status status-${esc(b.status)}">${esc(t('status.' + b.status))}</span></p>
      <p class="done-ticket"><span>${t('done.number')}</span><b>${fmtCode(b.code)}</b></p>
      ${kv(bookingRows(b))}
      ${cancellable ? `<button type="button" class="btn btn-secondary btn-block" data-action="cancel-booking" data-code="${esc(b.code)}" data-phone="${esc(phone)}">${icon('i-x')}<span>${t('manage.cancel')}</span></button>` : ''}
      ${active && !cancellable ? `<p class="note note-warn">${esc(t('manage.tooLate'))}</p>` : ''}
      <button type="button" class="btn btn-ghost btn-block" data-action="manage-again">${t('manage.another')}</button>
    </div>`;
    $('#manage-form').hidden = true;
    result.hidden = false;
  }

  // ------------------------------------------------------------ header bits
  function closeMenu() {
    $('#main-nav').classList.remove('is-open');
    $('.menu-btn').setAttribute('aria-expanded', 'false');
  }

  function setSize(n) {
    html.setAttribute('data-size', n);
    store.set('size', n);
    $$('.size-seg [data-size]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.size) === n)));
    fitHeader();
  }

  // Collapse the header one step at a time until everything fits on one line.
  const HDR_STEPS = ['hdr-1', 'hdr-2', 'hdr-3', 'hdr-4', 'hdr-5', 'hdr-6', 'hdr-7'];
  function fitHeader() {
    const inner = $('.header-inner');
    const wasOpen = $('#main-nav').classList.contains('is-open');
    html.classList.remove(...HDR_STEPS);
    for (const step of HDR_STEPS) {
      if (inner.scrollWidth <= inner.clientWidth + 1) break;
      html.classList.add(step);
    }
    if (wasOpen && !html.classList.contains('hdr-2')) closeMenu();
  }

  function fillBrand() {
    const b = C.brand;
    $$('[data-brand="phone"]').forEach((el) => { el.textContent = b.phone; });
    $$('[data-brand="email"]').forEach((el) => { el.textContent = b.email; });
    $$('[data-tel]').forEach((el) => { el.href = 'tel:' + b.phoneHref; });
    $$('[data-sms]').forEach((el) => { el.href = 'sms:' + b.sms; });
    $$('[data-wa]').forEach((el) => { el.href = 'https://wa.me/' + b.whatsapp; });
    $$('[data-mail]').forEach((el) => { el.href = 'mailto:' + b.email; });
  }

  function syncTripForm() {
    setMode(state.mode);
    $('#airport-select').value = state.airport;
    picker.sync();
    renderWhen();
    ['pax', 'bags', 'hours'].forEach(renderStepper);
  }

  function renderAll() {
    renderAirportSelect();
    fillTimeSelect($('#trip-hour'), '--');
    fillTimeSelect($('#trip-min'), '--');
    fillTimeSelect($('#return-hour'), '--');
    fillTimeSelect($('#return-min'), '--');
    syncTripForm();
    renderClock();
    renderFleet();
    renderRoutes();
    renderAirports();
    renderReviews();
    const step = currentStep();
    if (step) showStep(step, true);
  }

  // -------------------------------------------------------------- event wiring
  function bind() {
    // Language, text size, contrast, menu
    $$('.lang-switch [data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
    $$('.size-seg [data-size]').forEach((b) => b.addEventListener('click', () => setSize(Number(b.dataset.size))));
    $('#contrast-toggle').checked = html.classList.contains('hc');
    $('#contrast-toggle').addEventListener('change', (e) => {
      html.classList.toggle('hc', e.target.checked);
      store.set('contrast', e.target.checked);
    });

    // Trip form
    $$('.trip-tabs [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('#swap-btn').addEventListener('click', () => setMode(state.mode === 'from' ? 'to' : 'from'));
    $('#airport-select').addEventListener('change', (e) => {
      state.airport = e.target.value;
      // "Today" depends on the airport's time zone.
      if (state.when === 'today' || state.when === 'tomorrow') setWhen(state.when);
      renderClock();
      saveState();
    });
    $$('.when-chips [data-when]').forEach((b) => b.addEventListener('click', () => setWhen(b.dataset.when)));
    $('#trip-date').addEventListener('change', (e) => { state.date = e.target.value; setError('when', ''); saveState(); });
    $('#trip-hour').addEventListener('change', (e) => { state.hour = e.target.value; setError('when', ''); saveState(); });
    $('#trip-min').addEventListener('change', (e) => { state.min = e.target.value; setError('when', ''); saveState(); });
    $('#trip-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validateTrip()) go('#/book');
    });

    // Fleet carousel
    $$('[data-carousel]').forEach((b) => b.addEventListener('click', () => scrollCarousel(Number(b.dataset.carousel))));
    $('#fleet-grid').addEventListener('scroll', () => requestAnimationFrame(updateCarousel), { passive: true });
    window.addEventListener('resize', updateCarousel);

    // Steppers (aria-disabled keeps the button focusable for keyboard users)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.step-btn');
      if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
      const name = btn.closest('[data-stepper]').dataset.stepper;
      const s = STEPPERS[name];
      s.set(Math.min(s.max, Math.max(s.min, s.get() + Number(btn.dataset.step))));
      renderStepper(name);
      saveState();
    });

    // Car step
    $('#car-list').addEventListener('click', (e) => {
      const card = e.target.closest('.car-card');
      if (!card) return;
      if (card.getAttribute('aria-disabled') === 'true') {
        toast(card.querySelector('.car-nofit').textContent);
        return;
      }
      selectVehicle(card.dataset.vehicle);
    });
    $('#return-toggle').addEventListener('change', (e) => {
      state.ret.on = e.target.checked;
      if (state.ret.on && !state.ret.date) state.ret.date = state.when === 'now' ? nowLocal().date : state.date;
      renderReturn();
      setError('return', '');
      updateTotals();
      renderSummary();
      saveState();
    });
    $('#return-date').addEventListener('change', (e) => { state.ret.date = e.target.value; setError('return', ''); renderSummary(); saveState(); });
    $('#return-hour').addEventListener('change', (e) => { state.ret.hour = e.target.value; setError('return', ''); renderSummary(); saveState(); });
    $('#return-min').addEventListener('change', (e) => { state.ret.min = e.target.value; setError('return', ''); renderSummary(); saveState(); });
    $('#car-continue').addEventListener('click', () => {
      if (!vehicleOk()) {
        $('#car-error').textContent = t('err.car');
        $('#car-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
        const first = $('#car-list .car-card:not([aria-disabled="true"])');
        if (first) first.focus({ preventScroll: true });
        return;
      }
      if (!validateReturn()) return;
      saveStateNow();
      go('#/details');
    });

    // Details step
    const d = state.det;
    const bindInput = (id, key, after) => $('#' + id).addEventListener('input', (e) => {
      d[key] = e.target.value;
      setError(id, '');
      if (after) after(e.target.value);
      saveState();
    });
    bindInput('p-name', 'name', (v) => { if (!d.signEdited) { d.sign = v; $('#sign').value = v; } });
    bindInput('p-phone', 'phone');
    bindInput('p-email', 'email');
    bindInput('b-name', 'bName');
    bindInput('b-phone', 'bPhone');
    bindInput('flight', 'flight');
    bindInput('sign', 'sign', (v) => { d.signEdited = v.trim() !== ''; });
    bindInput('address', 'address');
    bindInput('comment', 'comment');
    $('#assist').addEventListener('change', (e) => { d.assist = e.target.checked; saveState(); });
    $('#driver-lang').addEventListener('change', (e) => { d.driverLang = e.target.value; saveState(); });
    $$('input[name="pay"]').forEach((r) => r.addEventListener('change', () => { d.pay = r.value; saveState(); }));
    $$('#who-chips [data-who]').forEach((b) => b.addEventListener('click', () => {
      d.who = b.dataset.who;
      renderDetails();
      saveState();
    }));
    $$('#via-chips [data-via]').forEach((b) => b.addEventListener('click', () => {
      d.via = b.dataset.via;
      setChips($('#via-chips'), 'via', d.via);
      saveState();
    }));
    $('#promo-apply').addEventListener('click', () => {
      d.promo = $('#promo').value.trim().toUpperCase();
      $('#promo').value = d.promo;
      renderPromoMsg();
      updateTotals();
      renderSummary();
      saveState();
    });
    $('#promo').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#promo-apply').click(); } });
    $('#step-details').addEventListener('submit', (e) => { e.preventDefault(); submitBooking(); });

    // Phone fields: offer the home prefix, tidy the number on blur.
    // If the visitor types their own country code after the prefix, drop ours.
    const prefixRe = C.phonePrefix.replace(/[+]/g, '\\+');
    const PREFIX_THEN_CODE = new RegExp('^' + prefixRe + '\\s*(\\+|00)');
    const PREFIX_ONLY = new RegExp('^' + prefixRe + '\\s*');
    $$('[data-phone]').forEach((input) => {
      input.addEventListener('focus', () => { if (!input.value) input.value = C.phonePrefix + ' '; });
      input.addEventListener('input', () => {
        if (PREFIX_THEN_CODE.test(input.value)) {
          input.value = input.value.replace(PREFIX_ONLY, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      input.addEventListener('blur', () => {
        const v = input.value.trim();
        if (v === C.phonePrefix || v === '+') input.value = '';
        else if (core.normPhone(v)) input.value = core.fmtPhone(core.normPhone(v));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    // Manage booking
    $('#manage-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = $('#m-code').value.replace(/\D/g, '');
      const phone = core.normPhone($('#m-phone').value);
      const err = $('#manage-error');
      err.textContent = '';
      if (code.length !== 6 || !phone) { err.textContent = t('manage.missing'); return; }
      try {
        renderManage(await api.findBooking(code, phone));
      } catch (ex) {
        err.textContent = ex && ex.status === 404 ? t('manage.notFound') : t('err.network');
      }
    });

    // Call me back
    $('#callback-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = core.normPhone($('#cb-phone').value);
      const err = $('#cb-error');
      err.textContent = '';
      if (!phone) { err.textContent = t('err.phone'); $('#cb-phone').focus(); return; }
      try {
        await api.callback({ name: $('#cb-name').value.trim(), phone, lang });
        $('#callback-form').hidden = true;
        $('#callback-done').hidden = false;
      } catch (ex) {
        err.textContent = t('err.network');
      }
    });

    // Close dialogs with their × button or a click on the backdrop.
    $$('dialog').forEach((dlg) => {
      dlg.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]') || e.target === dlg) dlg.close();
      });
    });

    // Delegated actions
    document.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-action], [data-route], [data-airport]');
      if (!el) return;

      if (el.dataset.route != null) {
        const r = C.popularRoutes[Number(el.dataset.route)];
        const pl = C.places.find((p) => p.id === r.place);
        state.airport = r.airport;
        state.place = { id: pl.id, type: pl.type, name: pl.name, sub: '', lat: pl.lat, lon: pl.lon };
        setMode('from');
        syncTripForm();
        setError('place', '');
        scrollToForm('.when-chips .chip');
        return;
      }
      if (el.dataset.airport) {
        state.airport = el.dataset.airport;
        if (state.mode === 'hourly') setMode('from');
        if (state.place && P.haversineMiles(airportById(state.airport), state.place) > 100 && state.place.type !== 'city') state.place = null;
        syncTripForm();
        saveState();
        scrollToForm('#place-input');
        return;
      }

      switch (el.dataset.action) {
        case 'menu': {
          const nav = $('#main-nav');
          const open = !nav.classList.contains('is-open');
          nav.classList.toggle('is-open', open);
          el.setAttribute('aria-expanded', String(open));
          break;
        }
        case 'a11y': {
          const panel = $('#a11y-panel');
          panel.hidden = !panel.hidden;
          el.setAttribute('aria-expanded', String(!panel.hidden));
          break;
        }
        case 'manage':
          closeMenu();
          openManage();
          break;
        case 'manage-again':
          $('#manage-result').hidden = true;
          $('#manage-form').hidden = false;
          $('#m-code').value = '';
          $('#m-code').focus();
          break;
        case 'cancel-booking': {
          const code = el.dataset.code;
          if (!window.confirm(t('manage.cancelConfirm', { code: fmtCode(code) }))) return;
          try {
            const b = await api.cancelBooking(code, el.dataset.phone);
            renderManage(b);
            if (state.booking && state.booking.code === code) state.booking.status = 'cancelled';
            toast(t('manage.cancelled'));
          } catch (ex) {
            toast(ex && ex.status === 409 ? t('manage.tooLate') : t('err.network'));
          }
          break;
        }
        case 'callback':
          $('#callback-form').hidden = false;
          $('#callback-done').hidden = true;
          openDialog('#dlg-callback');
          setTimeout(() => $('#cb-phone').focus(), 50);
          break;
        case 'scroll-form':
          scrollToForm();
          break;
        case 'reserve':
          if ($('#view-home').hidden) { pendingScroll = true; go('#/'); } else scrollToForm();
          break;
        case 'book-mode':
          setMode(el.dataset.mode);
          if (el.dataset.pax) {
            state.pax = Math.max(state.pax, Number(el.dataset.pax));
            renderStepper('pax');
            saveState();
          }
          scrollToForm(state.place ? '.when-chips .chip' : '#place-input');
          break;
        case 'book-for-other':
          state.det.who = 'other';
          saveState();
          scrollToForm('#place-input');
          break;
        case 'pick-vehicle':
          state.vehicle = el.dataset.vehicle;
          saveState();
          toast(`${t('car.selected')}: ${t('car.' + state.vehicle)}`);
          scrollToForm(state.place ? '.when-chips .chip' : '#place-input');
          break;
        case 'edit-trip':
          pendingScroll = true;
          go('#/');
          break;
        case 'back':
          if (currentStep() === 'details') go('#/book');
          else { pendingScroll = true; go('#/'); }
          break;
        case 'ics':
          downloadIcs();
          break;
        case 'print':
          window.print();
          break;
        case 'share':
          shareBooking();
          break;
        case 'book-return':
          bookReturn();
          break;
      }
    });

    // Close the menu / accessibility panel when clicking elsewhere or pressing Escape.
    document.addEventListener('click', (e) => {
      const panel = $('#a11y-panel');
      if (!panel.hidden && !e.target.closest('#a11y-panel, [data-action="a11y"]')) {
        panel.hidden = true;
        $('[data-action="a11y"]').setAttribute('aria-expanded', 'false');
      }
      if (e.target.closest('#main-nav a')) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('#a11y-panel').hidden) { $('#a11y-panel').hidden = true; $('[data-action="a11y"]').focus(); }
      closeMenu();
    });

    $('.logo').addEventListener('click', (e) => {
      if (!$('#view-home').hidden && (location.hash === '#/' || !location.hash)) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Hide the mobile quick bar while typing so it never covers a field.
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('input:not([type="checkbox"]):not([type="radio"]), select, textarea')) document.body.classList.add('typing');
    });
    document.addEventListener('focusout', () => document.body.classList.remove('typing'));
    $('#flight').addEventListener('blur', (e) => {
      const v = e.target.value.trim().toUpperCase().replace(/^([A-Z0-9]{2})-?\s*(\d)/, '$1 $2');
      if (v !== e.target.value) { e.target.value = v; d.flight = v; saveState(); }
    });

    window.addEventListener('hashchange', route);
    setInterval(renderClock, 30000);
  }

  // A public demo must not send visitors to placeholder contacts that may belong to strangers.
  function setupDemo() {
    if (!STATIC_DEMO) return;
    $('#demo-bar').hidden = false;
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-tel], [data-sms], [data-wa], [data-mail]')) return;
      e.preventDefault();
      toast(t('demo.contacts'));
    }, true);
  }

  // ---------------------------------------------------------------------- go
  setupDemo();
  fillBrand();
  applyI18n();
  setSize(Number(html.getAttribute('data-size')) || 1);
  bind();
  let fitFrame = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fitHeader); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeader);
  renderAll();
  route();
  html.classList.remove('i18n-wait');
})();
