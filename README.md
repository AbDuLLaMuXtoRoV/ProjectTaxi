# Safar — airport taxi booking for Uzbekistan

A fast, mobile-first booking site for airport transfers in Uzbekistan. It is in Uzbek, Russian and English, built for older users, and has no build step and no dependencies.

## Run it

```bash
node server.js          # Node 18 or newer
# open http://localhost:3000
```

You can also open `public/index.html` straight from disk. The site then runs in **demo mode**: bookings are kept only in that browser and a notice says so.

## Live demo

**https://abdullamuxtorov.github.io/ProjectTaxi/** is served by GitHub Pages from the `gh-pages` branch, which holds the contents of `public/`. GitHub Pages cannot run `server.js`, so the demo always runs in demo mode: a banner says so, bookings stay in the visitor's browser, and the placeholder phone, Telegram and WhatsApp links are disabled.

To update the demo after committing changes to `main`:

```bash
npm run deploy:demo     # pushes public/ to the gh-pages branch
```

## What's inside

| Path | What it is |
| --- | --- |
| `public/js/config.js` | **Edit this first.** Brand, phone, Telegram and WhatsApp, prices, cars, airports, popular places and routes, reviews |
| `public/js/i18n.js` | All text in `en` / `ru` / `uz`, side by side |
| `public/js/pricing.js` | Fixed-price formula, shared by the browser and the server |
| `public/js/booking-core.js` | Booking validation, shared by the server and demo mode |
| `public/js/app.js` | Site logic: booking steps, place search, map, dialogs |
| `public/css/styles.css` | Design: lapis, turquoise and gold palette; large-text and high-contrast modes |
| `server.js` | Static files, booking API, Telegram alerts, `/admin` page |
| `data/db.json` | Bookings and call-back requests (created automatically) |

## Settings (`.env`)

Copy `.env.example` to `.env`:

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: every new booking, cancellation and "call me back" request is posted to your dispatchers' Telegram group.
- `ADMIN_PASSWORD`: turns on `/admin`, a list of bookings with status buttons (New → Confirmed → Driver assigned → Completed / Cancelled) and call-back requests.
- `PORT`, `TRUST_PROXY=1` (set this when running behind nginx).

## Prices

`price = base + perKm × km`, never below `min`. Kilometres after 60 km cost 30% less. A return trip is 10% off, and child seats and help for elderly passengers are free. Hourly price is `hour × hours` (minimum 2 hours). Distances are estimated from coordinates, so the same trip always gets the same price. All numbers are in `config.js`.

## API

- `POST /api/bookings`: create a booking. The server recalculates the price and returns a 6-digit booking number.
- `GET /api/bookings/:code?phone=…`: look up a booking (the passenger's or the booker's phone).
- `POST /api/bookings/:code/cancel` `{ phone }`: free cancellation up to 3 hours before pickup.
- `POST /api/callback` `{ name, phone }`: "call me back" request.

## Before launch

1. **Replace the placeholders** in `config.js`: brand name, phone, Telegram, WhatsApp, email and site URL. These are marked `TODO`. Also update the phone and name in `index.html` (they appear in `<head>`, the JSON-LD block and the `<noscript>` text), and replace the sample reviews with real ones.
2. **Check the prices** against your real costs.
3. **Address search and routing** use free public services: Photon for addresses, OSRM for routes and OpenStreetMap for map tiles. These are fine for testing but can be slow or rate-limited. For production, switch to a keyed provider (Yandex Maps or Google Places are well known in Uzbekistan). Without them the site still works: it falls back to the built-in places, districts and distance estimates.
4. Run it behind HTTPS (nginx or Caddy). A JSON file is enough for a small team; move to a database (SQLite or Postgres) when bookings grow.
