# LimoBay — airport car service booking (US)

A fast, mobile-first booking site for airport rides in the United States. It covers 22 major airports, is in English and Spanish, is built to be easy for older travelers, and has no build step and no dependencies.

## Run it

```bash
node server.js          # Node 18 or newer
# open http://localhost:3000
```

You can also open `public/index.html` straight from disk. The site then runs in **demo mode**: bookings are kept only in that browser and a notice says so.

## Live demo

**https://abdullamuxtorov.github.io/ProjectTaxi/** is served by GitHub Pages from the `gh-pages` branch, which holds the contents of `public/`. GitHub Pages cannot run `server.js`, so the demo always runs in demo mode: a banner says so, bookings stay in the visitor's browser, and the placeholder phone, text and WhatsApp links are disabled.

To update the demo after committing changes to `main`:

```bash
npm run deploy:demo     # pushes public/ to the gh-pages branch
```

## What's inside

| Path | What it is |
| --- | --- |
| `public/js/config.js` | **Edit this first.** Brand, phone, prices, vehicles, airports (with time zones), popular places and routes, reviews |
| `public/js/i18n.js` | All text in `en` / `es`, side by side |
| `public/js/pricing.js` | Flat-rate formula in dollars and miles, shared by the browser and the server |
| `public/js/booking-core.js` | Booking validation, time zones and US phone numbers, shared by the server and demo mode |
| `public/js/app.js` | Site logic: booking steps, place search, map, dialogs |
| `public/css/styles.css` | Design: night navy and gold with cream booking cards, in the style of premium chauffeur sites; large-text and high-contrast modes |
| `public/img/photos/`, `public/img/fleet/` | Photographs (WebP). Fleet photos are cut out and placed on one studio backdrop so every car looks consistent |
| `server.js` | Static files, booking API, Telegram alerts for dispatchers, `/admin` page |
| `data/db.json` | Bookings and call-back requests (created automatically) |

## Settings (`.env`)

Copy `.env.example` to `.env`:

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: every new booking, cancellation and "call me back" request is posted, in English, to your dispatchers' Telegram group.
- `ADMIN_PASSWORD`: turns on `/admin`, a list of bookings with status buttons (New → Confirmed → Chauffeur assigned → Completed / Cancelled) and call-back requests.
- `PORT`, `TRUST_PROXY=1` (set this when running behind nginx).

## Prices and times

- **Prices** are all-inclusive (tolls, taxes, airport fees and gratuity). `price = base + perMile × miles`, never below `min`, rounded up to $5. Miles after 50 cost 25% less. A return trip is 10% off; child seats and help for seniors are free. Hourly price is `hour × hours` (minimum 2 hours). Distances are estimated from coordinates, so the same trip always gets the same price.
- **Times** are always local to the airport (each airport has its time zone in `config.js`, daylight saving included) and shown on a 12-hour clock.

## API

- `POST /api/bookings`: create a booking. The server recalculates the price and returns a 6-digit booking number.
- `GET /api/bookings/:code?phone=…`: look up a booking (the passenger's or the booker's phone).
- `POST /api/bookings/:code/cancel` `{ phone }`: free cancellation up to 3 hours before pickup.
- `POST /api/callback` `{ name, phone }`: "call me back" request.

## Photos

All photos come from [Unsplash](https://unsplash.com/license) (free for commercial use, no attribution required; the footer still credits Unsplash). Licence plates were blurred. For launch, replace the fleet photos with pictures of the client's own vehicles: keep the 1200 × 700 size and a plain light background so the cards stay consistent.

| File in `public/img/` | Source |
| --- | --- |
| `photos/hero.webp`, `photos/hero-m.webp`, `og.jpg` | https://unsplash.com/photos/ZmcOEbW3hDg |
| `photos/aviation.webp` | https://unsplash.com/photos/8JDsSX6uRA4 |
| `photos/reserve.webp` | https://unsplash.com/photos/KzZ2FHwNNFQ |
| `photos/city.webp` | https://unsplash.com/photos/rJ6tE-b1XXI |
| `photos/svc-airport.webp` | https://unsplash.com/photos/HhmWbbWCKjk |
| `photos/svc-corporate.webp` | https://unsplash.com/photos/MllJgoAFTcE |
| `photos/svc-hourly.webp` | https://unsplash.com/photos/-J3tzK3FPxQ |
| `photos/svc-groups.webp` | https://unsplash.com/photos/dnKYbheRklA |
| `photos/exp-seats.webp` | https://unsplash.com/photos/sEKGGWNpSw0 |
| `photos/exp-detail.webp` | https://unsplash.com/photos/CTHf0y5NXP0 |
| `photos/exp-van.webp` | https://unsplash.com/photos/PNW4oeltJGo |
| `photos/exp-hotel.webp` | https://unsplash.com/photos/W0errM88deI |
| `photos/why.webp` | https://unsplash.com/photos/t6sIyh2swzQ |
| `fleet/standard.webp` | https://unsplash.com/photos/YPfnvLc3bbQ |
| `fleet/business.webp` | https://unsplash.com/photos/9gaF0iaVvHs |
| `fleet/suv.webp` | https://unsplash.com/photos/zbuyWZEMNmI |
| `fleet/first.webp` | https://unsplash.com/photos/pgWzo-bNUeM |
| `fleet/premium-suv.webp` | https://unsplash.com/photos/4Dofvf-eUMs |
| `fleet/sprinter.webp` | https://unsplash.com/photos/w6NdCQ-FqiM |

## Before launch

1. **Replace the placeholders** in `config.js`: phone (`555-0147` is a fictional number), SMS, WhatsApp, email and site URL (`limobay.example` is a placeholder domain). These are marked `TODO`. Also update the phone in `index.html` (it appears in `<head>`, the JSON-LD block and the `<noscript>` text), and replace the sample reviews with real ones.
2. **Choose your airports and check the prices** against your real costs. Remove the airports you don't serve from `config.js`.
3. **Address search and routing** use free public services: Photon for addresses, OSRM for routes and OpenStreetMap for map tiles. These are fine for testing but can be slow or rate-limited. For production, switch to a keyed provider such as Google Places or Mapbox. Without them the site still works: it falls back to the built-in places and distance estimates.
4. Run it behind HTTPS (nginx or Caddy). A JSON file is enough for a small team; move to a database (SQLite or Postgres) when bookings grow. For SMS confirmations to customers, connect a provider such as Twilio.
