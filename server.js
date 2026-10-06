/*
 * LimoBay — web server. No dependencies: `node server.js`.
 *
 *  - Serves the site from ./public (gzip + ETag caching)
 *  - Booking API: create, look up, cancel; "call me back" requests
 *  - Stores everything in ./data/db.json (atomic writes)
 *  - Sends every new booking / call-back to a Telegram chat (optional)
 *  - Simple dispatcher page at /admin (optional, password protected)
 *
 * Settings come from environment variables or a .env file (see .env.example).
 */
'use strict';

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

loadEnv(path.join(__dirname, '.env'));

const config = require('./public/js/config.js');
const pricing = require('./public/js/pricing.js')(config);
const core = require('./public/js/booking-core.js')(config, pricing);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};
const COMPRESSIBLE = /\.(html|css|js|json|svg|webmanifest|txt)$/;

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "connect-src 'self' https://photon.komoot.io https://router.project-osrm.org",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CSP
};

// ------------------------------------------------------------------ storage
let db = { bookings: [], callbacks: [] };
try {
  db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error(`Could not read ${DB_FILE}: ${e.message}`);
    process.exit(1);
  }
}

let writeChain = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(db, null, 2);
  writeChain = writeChain
    .then(async () => {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      const tmp = DB_FILE + '.tmp';
      await fsp.writeFile(tmp, snapshot);
      await fsp.rename(tmp, DB_FILE);
    })
    .catch((e) => console.error('Saving failed:', e.message));
  return writeChain;
}

const findBooking = (code) => db.bookings.find((b) => b.code === code);

// --------------------------------------------------------------- rate limit
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((ts) => now - ts < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, list] of hits) if (list.every((ts) => now - ts > 3600000)) hits.delete(key);
}, 600000).unref();

function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

// ------------------------------------------------------------------ helpers
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-LimoBay-Api': '1'
  }, SECURITY_HEADERS));
  res.end(body);
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('too_large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(Object.assign(new Error('bad_json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

// What a customer may see about their own booking.
function publicView(b) {
  const { code, status, createdAt, mode, airport, tz, place, asap, date, time, pickupAt, pax, bags, hours, vehicle, ret, passenger, booker, via, email, flight, sign, address, comment, childSeats, assist, driverLang, pay, lang, price } = b;
  return { code, status, createdAt, mode, airport, tz, place, asap, date, time, pickupAt, pax, bags, hours, vehicle, ret, passenger, booker, via, email, flight, sign, address, comment, childSeats, assist, driverLang, pay, lang, price };
}

// ----------------------------------------------------------------- telegram
const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const usd = (n) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const time12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const usDate = (d) => { const [y, m, day] = d.split('-'); return `${m}/${day}/${y}`; };
const MODE_EN = { from: '✈️ From airport', to: '🛫 To airport', hourly: '⏱ By the hour' };
const PAY_EN = { card: 'card', app: 'Apple Pay / Google Pay', cash: 'cash' };
const VIA_EN = { call: 'call', sms: 'text', whatsapp: 'WhatsApp' };
const CAR_EN = { standard: 'Standard Sedan', business: 'Business Sedan', suv: 'SUV', first: 'First Class', 'premium-suv': 'Premium SUV', sprinter: 'Sprinter Van' };
const carName = (id) => CAR_EN[id] || id;

function routeText(b, short) {
  const ap = config.airports.find((a) => a.id === b.airport);
  const apText = ap ? (short ? ap.id : `${ap.id} (${ap.city.en})`) : '';
  if (b.mode === 'from') return `${apText} → ${b.place.name}`;
  if (b.mode === 'to') return `${b.place.name} → ${apText}`;
  return `${b.place.name}, ${b.hours} hr`;
}

function bookingMessage(b, title) {
  const ap = config.airports.find((a) => a.id === b.airport);
  const local = ap ? ` (${ap.city.en} time)` : '';
  const when = `${b.asap ? '<b>ASAP</b>, by ' : ''}${usDate(b.date)} ${time12(b.time)}${local}`;
  const lines = [
    `${title} <b>#${b.code}</b>`,
    `${MODE_EN[b.mode]}: ${escHtml(routeText(b))}`,
    `🕒 ${when}${b.flight ? ` · flight ${escHtml(b.flight)}` : ''}`,
    `🚗 ${carName(b.vehicle)} · 👤 ${b.pax} · 🧳 ${b.bags}`,
    `👤 ${escHtml(b.passenger.name)} ${core.fmtPhone(b.passenger.phone)} (${VIA_EN[b.via]})`
  ];
  if (b.booker) lines.push(`📞 Booked by: ${escHtml(b.booker.name)} ${core.fmtPhone(b.booker.phone)}`);
  if (b.sign) lines.push(`🪧 Sign: ${escHtml(b.sign)}`);
  if (b.address) lines.push(`📍 ${escHtml(b.address)}`);
  if (b.ret) lines.push(`↩️ Return: ${usDate(b.ret.date)} ${time12(b.ret.time)}`);
  const extras = [];
  if (b.childSeats) extras.push(`child seat × ${b.childSeats}`);
  if (b.assist) extras.push('senior / wheelchair assistance');
  if (b.driverLang !== 'any') extras.push(`chauffeur speaks ${b.driverLang.toUpperCase()}`);
  if (extras.length) lines.push(`➕ ${extras.join(', ')}`);
  if (b.comment) lines.push(`💬 ${escHtml(b.comment)}`);
  lines.push(`💰 <b>${usd(b.price.total)}</b> · ${PAY_EN[b.pay]}${b.price.promo ? ` · promo ${escHtml(b.price.promo)}` : ''}`);
  lines.push(`🌐 Customer language: ${b.lang.toUpperCase()}${b.email ? ` · ${escHtml(b.email)}` : ''}`);
  return lines.join('\n');
}

async function notify(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) console.error('Telegram error:', res.status, await res.text());
  } catch (e) {
    console.error('Telegram error:', e.message);
  }
}

// ---------------------------------------------------------------------- API
async function handleApi(req, res, url) {
  const ip = clientIp(req);
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'bookings', code, 'cancel']

  if (req.method === 'GET' && url.pathname === '/api/health') return sendJson(res, 200, { ok: true });

  if (req.method === 'POST' && url.pathname === '/api/bookings') {
    if (limited('book:' + ip, 10, 10 * 60000)) return sendJson(res, 429, { error: 'too_many' });
    const body = await readJson(req, 20000);
    const result = core.normalize(body);
    if (result.error) return sendJson(res, 400, result);
    const booking = Object.assign({ code: core.newCode((c) => !!findBooking(c)), createdAt: new Date().toISOString() }, result.booking, { history: [{ at: new Date().toISOString(), status: 'new' }] });
    db.bookings.push(booking);
    await persist();
    notify(bookingMessage(booking, '🆕 New booking'));
    console.log(`Booking ${booking.code}: ${booking.mode} ${booking.airport} ${booking.vehicle} ${booking.price.total}`);
    return sendJson(res, 201, { booking: publicView(booking) });
  }

  if (parts[0] === 'api' && parts[1] === 'bookings' && /^\d{6}$/.test(parts[2] || '')) {
    if (limited('lookup:' + ip, 30, 10 * 60000)) return sendJson(res, 429, { error: 'too_many' });
    const b = findBooking(parts[2]);

    if (req.method === 'GET' && parts.length === 3) {
      if (!b || !core.phoneMatches(b, url.searchParams.get('phone'))) return sendJson(res, 404, { error: 'not_found' });
      return sendJson(res, 200, { booking: publicView(b) });
    }

    if (req.method === 'POST' && parts[3] === 'cancel' && parts.length === 4) {
      const body = await readJson(req, 2000);
      if (!b || !core.phoneMatches(b, body.phone)) return sendJson(res, 404, { error: 'not_found' });
      if (!core.canCancel(b)) return sendJson(res, 409, { error: 'too_late' });
      b.status = 'cancelled';
      (b.history = b.history || []).push({ at: new Date().toISOString(), status: 'cancelled', by: 'customer' });
      await persist();
      notify(`❌ Customer cancelled booking <b>#${b.code}</b>\n${escHtml(b.passenger.name)} ${core.fmtPhone(b.passenger.phone)}`);
      return sendJson(res, 200, { booking: publicView(b) });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/callback') {
    if (limited('cb:' + ip, 5, 10 * 60000)) return sendJson(res, 429, { error: 'too_many' });
    const body = await readJson(req, 2000);
    const phone = core.normPhone(body.phone);
    if (!phone) return sendJson(res, 400, { error: 'phone', field: 'cb-phone' });
    const item = { id: crypto.randomUUID(), at: new Date().toISOString(), name: String(body.name || '').trim().slice(0, 80), phone, lang: ['en', 'es'].includes(body.lang) ? body.lang : 'en', done: false };
    db.callbacks.push(item);
    await persist();
    notify(`📞 <b>Call back</b>: ${core.fmtPhone(phone)}${item.name ? ` — ${escHtml(item.name)}` : ''} (language: ${item.lang.toUpperCase()})`);
    return sendJson(res, 201, { ok: true });
  }

  return sendJson(res, 404, { error: 'not_found' });
}

// -------------------------------------------------------------------- admin
const STATUSES = ['new', 'confirmed', 'assigned', 'completed', 'cancelled'];
const STATUS_EN = { new: 'New', confirmed: 'Confirmed', assigned: 'Chauffeur assigned', completed: 'Completed', cancelled: 'Cancelled' };

function adminAuthorized(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const [, pass] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(/:(.*)/s);
  const a = crypto.createHash('sha256').update(pass || '').digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

function adminPage() {
  const rows = db.bookings.slice().sort((a, b) => Date.parse(b.pickupAt) - Date.parse(a.pickupAt)).map((b) => {
    const buttons = STATUSES.filter((s) => s !== b.status).map((s) => `<button name="status" value="${s}">${STATUS_EN[s]}</button>`).join('');
    return `<tr class="st-${b.status}">
      <td><b>${b.code}</b><br><small>${escHtml(b.createdAt.slice(0, 16).replace('T', ' '))} UTC</small></td>
      <td>${b.asap ? '<b>ASAP</b><br>' : ''}${usDate(b.date)} ${time12(b.time)}<br><small>${escHtml(b.airport)} local time</small>${b.flight ? `<br>✈ ${escHtml(b.flight)}` : ''}</td>
      <td>${escHtml(routeText(b, true))}${b.ret ? `<br><small>↩ ${usDate(b.ret.date)} ${time12(b.ret.time)}</small>` : ''}${b.address ? `<br><small>📍 ${escHtml(b.address)}</small>` : ''}</td>
      <td>${carName(b.vehicle)}<br><small>👤${b.pax} 🧳${b.bags}${b.childSeats ? ` 👶${b.childSeats}` : ''}${b.assist ? ' ♿' : ''}</small></td>
      <td>${escHtml(b.passenger.name)}<br><a href="tel:${b.passenger.phone}">${core.fmtPhone(b.passenger.phone)}</a> <small>${VIA_EN[b.via]}</small>${b.booker ? `<br><small>Booked by: ${escHtml(b.booker.name)} ${core.fmtPhone(b.booker.phone)}</small>` : ''}${b.comment ? `<br><small>💬 ${escHtml(b.comment)}</small>` : ''}</td>
      <td><b>${usd(b.price.total)}</b><br><small>${PAY_EN[b.pay]}</small></td>
      <td><span class="st">${STATUS_EN[b.status]}</span><form method="post" action="/admin/bookings/${b.code}">${buttons}</form></td>
    </tr>`;
  }).join('');
  const callbacks = db.callbacks.filter((c) => !c.done).map((c) => `<li><a href="tel:${c.phone}">${core.fmtPhone(c.phone)}</a> ${escHtml(c.name)} <small>${escHtml(c.at.slice(0, 16).replace('T', ' '))} UTC · ${c.lang}</small>
    <form method="post" action="/admin/callbacks/${c.id}"><button>Done</button></form></li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LimoBay — bookings</title>
  <style>
    body{font:15px/1.45 system-ui,sans-serif;margin:0;background:#FAF6EE;color:#12203A}
    header{background:#0A1A33;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
    main{padding:20px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}
    th,td{padding:10px;border-bottom:1px solid #EAE0CD;text-align:left;vertical-align:top}th{background:#F4EDE0;font-size:13px}
    small{color:#66728A}.st{display:inline-block;font-weight:700;margin-bottom:6px}
    tr.st-new{background:#FFF8E6}tr.st-cancelled{opacity:.55}tr.st-completed{background:#F2FAF5}
    button{font:inherit;font-size:12px;margin:2px;padding:4px 8px;border:1px solid #C7BAA2;border-radius:6px;background:#fff;cursor:pointer}
    ul{background:#fff;border-radius:12px;padding:12px 32px}li form{display:inline}h2{font-size:18px}a{color:#0B6E79}
  </style></head><body>
  <header><b>LimoBay · bookings</b><span>${db.bookings.length} total</span></header>
  <main>
    ${callbacks ? `<h2>Call back</h2><ul>${callbacks}</ul>` : ''}
    <h2>Bookings</h2>
    <table><thead><tr><th>#</th><th>When</th><th>Route</th><th>Vehicle</th><th>Customer</th><th>Price</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No bookings yet</td></tr>'}</tbody></table>
  </main></body></html>`;
}

async function handleAdmin(req, res, url) {
  if (!ADMIN_PASSWORD) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Admin is disabled. Set ADMIN_PASSWORD to enable it.');
  }
  if (!adminAuthorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="LimoBay admin", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Password required');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (req.method === 'POST' && parts[1] === 'bookings' && parts[2]) {
    const form = new URLSearchParams(await readBody(req, 2000));
    const b = findBooking(parts[2]);
    const status = form.get('status');
    if (b && STATUSES.includes(status) && status !== b.status) {
      b.status = status;
      (b.history = b.history || []).push({ at: new Date().toISOString(), status, by: 'admin' });
      await persist();
    }
    res.writeHead(303, { Location: '/admin' });
    return res.end();
  }
  if (req.method === 'POST' && parts[1] === 'callbacks' && parts[2]) {
    await readBody(req, 2000);
    const c = db.callbacks.find((x) => x.id === parts[2]);
    if (c) { c.done = true; await persist(); }
    res.writeHead(303, { Location: '/admin' });
    return res.end();
  }
  res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, SECURITY_HEADERS));
  return res.end(adminPage());
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) { req.destroy(); reject(Object.assign(new Error('too_large'), { status: 413 })); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ------------------------------------------------------------- static files
async function serveStatic(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { rel = '/'; }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  let stat;
  try {
    stat = await fsp.stat(file);
    if (!stat.isFile()) throw new Error('not a file');
  } catch (e) {
    res.writeHead(404, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, SECURITY_HEADERS));
    return res.end('<!doctype html><meta charset="utf-8"><title>404</title><p style="font:18px system-ui;padding:40px">Page not found. <a href="/">LimoBay — home</a></p>');
  }

  const ext = path.extname(file).toLowerCase();
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const headers = Object.assign({
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300, must-revalidate',
    ETag: etag,
    Vary: 'Accept-Encoding'
  }, SECURITY_HEADERS);

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  const gzip = COMPRESSIBLE.test(file) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gzip) headers['Content-Encoding'] = 'gzip';
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  const stream = fs.createReadStream(file);
  stream.on('error', () => res.destroy());
  (gzip ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
}

// ------------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await handleAdmin(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    return await serveStatic(req, res, url);
  } catch (e) {
    if (!e.status) console.error(e);
    if (res.headersSent) return res.destroy();
    if (url.pathname.startsWith('/api/')) return sendJson(res, e.status || 500, { error: e.status ? e.message : 'server_error' });
    res.writeHead(e.status || 500);
    res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`LimoBay is running: http://localhost:${PORT}`);
  console.log(`Telegram notifications: ${TG_TOKEN && TG_CHAT ? 'on' : 'off (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)'}`);
  console.log(`Admin page: ${ADMIN_PASSWORD ? `http://localhost:${PORT}/admin` : 'off (set ADMIN_PASSWORD)'}`);
});

// --------------------------------------------------------------------- .env
function loadEnv(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
