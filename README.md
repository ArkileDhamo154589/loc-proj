# Meltemi Rentals: booking landing page

A bilingual (Greek / English) landing page for **Meltemi Rentals**, a small car hire company in Kos with a fleet of 12 cars. Today it takes bookings only by phone.

The page has one job: turn visitors who are comparing offers into **booking requests**. It does not try to be a brochure.

- `/`: Greek
- `/en/`: English

---

## 1. The problem this page solves

Meltemi charges **€35/day** for a small car in July, with everything included:

- full insurance with zero excess
- a second driver
- airport and port delivery
- full-to-full fuel
- 24/7 phone support
- no deposit blocked on the customer's card

Large competitors advertise **€8/day**. At the desk the customer finds:

- mandatory insurance
- a €1,200 excess blocked on the card
- an airport delivery fee
- an overpriced pre-paid tank

The real cost ends up around **€47-48/day**.

Visitors arrive having already seen "€8". The owner doesn't want to lower the price or name competitors. The page therefore has to show, within seconds and without a hard sell, that €35 is the cheaper and safer option.

## 2. Visitor journey and section order

| # | Section | Why it is here |
|---|---|---|
| 1 | **Hero**: "The price you see is the price you pay", with a harbour photo and a receipt card (six included items, "Extra charges at pick-up: €0") | Answers the visitor's main fear in the first 3 seconds |
| 2 | **Cost calculator: "Saw €8 a day?"** | The visitor picks rental days and sees the advertised €8 grow line by line (330€ for 7 days, about €47/day) next to Meltemi's €245. They do the maths themselves, so it never feels like a sales pitch. No competitor is named. |
| 3 | **Cars** (4 categories, final daily price) | Comes *after* the comparison, so €35 reads as a final price rather than an expensive one. "Request this car" preselects the category in the form. |
| 4 | **Three reasons** | Price certainty, zero excess with no deposit, meet-and-greet at arrivals |
| 5 | **Reviews and an owner quote** | Social proof just before the decision. The reviews repeat the same fear ("booked at €9, paid €310"). |
| 6 | **Five questions to ask wherever you book** | Instead of attacking competitors, the page gives visitors the questions to ask them, with a copy button. If they keep shopping, they carry Meltemi's criteria with them. |
| 7 | **Kefalos photo band**: "From the airport to Kefalos beach in 20 minutes" | Brings the holiday back into view right before the form |
| 8 | **Booking form** | Five required fields, the live final amount, "nothing to pay now, reply within 2 hours" |
| 9 | **FAQ** | Insurance scope, documents, payment, cancellation, late flights, ferries |
| 10 | **Footer** | Phone, WhatsApp, email, address, photo credits |

On phones, a sticky bar with **Check availability / WhatsApp / Call** appears once the hero is off screen and hides again when the form is visible.

## 3. Conversion details added beyond the brief

- **Cost calculator.** Visitors are persuaded by their own numbers rather than by a claim.
- **Five questions with a copy button.** Honest comparison works in Meltemi's favour.
- **Live total in the form**, e.g. "Family SUV, 10 days × €58 = €580. That's the whole amount."
- **Category preselection** from each car card, which saves a step.
- **Failure handling that keeps the lead.**
  - If sending fails (offline, timeout, server error), the details stay in the form.
  - A single button opens WhatsApp with the request already written.
  - Unsent input is also saved as a local draft.
- **Auto-reply in the visitor's language.** It contains:
  - the request number and final amount
  - what is included
  - a short, neutral comparison with a "cheap daily rate"
  - a request for **only the details that are missing** (mobile number, flight number, ferry time or hotel name)
- **Language suggestion bar.** The Greek page suggests English to non-Greek browsers and vice versa. Most visitors to Kos are not Greek.

## 4. Design decisions

- **Palette.** It comes from the product, not from decoration.
  - *Aegean blue* `#0D5EAF`: primary actions and Meltemi's price.
  - *Sun yellow* `#FFCF33`: price tags and highlights.
  - *Cost red* `#B8392A`: **only** hidden charges.
  - *Green* `#157A55`: **only** included items.
  - *Navy ink* `#0F2537`: text and borders.
  - Background: a cool whitewash grey `#EDF1F2` rather than pure white.
- **Bordered style.** Every card has a visible 2px outline and a hard offset shadow, like a printed receipt or a price sign. The visual language says "nothing hidden", which is the page's argument.
- **Typography.**
  - *Sofia Sans Condensed* for headlines and prices. It is compact and sign-like, so large numbers stay readable on a phone.
  - *Sofia Sans* for body text.
  - Both have full Greek support and are self-hosted.
- **Photos.** Real photos of the car models and of Kos. See [Photo credits](#9-photo-credits).
- **Icons.** An inline SVG sprite, with no emoji or icon fonts.
- **Motion.**
  - An orchestrated hero entrance: the location pill, headline and copy rise in, the photo wipes open, the receipt card slides up, its ticks draw one by one and the price tag drops in.
  - A top-down road strip under the hero, with cars driving both ways.
  - CSS scroll-driven reveals for cards and headings. They never fully hide content and need no JavaScript.
  - A Ken Burns effect on the Kefalos photo, and a one-time "stamp" on the hidden charges.
  - Interaction feedback: counting totals, button press and shine, category pick, form shake on error, success check.
  - Everything is disabled under `prefers-reduced-motion`.

## 5. Performance

Built for mobile visitors on a weak connection.

- No framework and no runtime dependencies. CSS and JS are inlined, so first paint needs a single request.
- The HTML is about 29 KB gzipped, including the inlined CSS and JS.
- Fonts are subset (Greek and Latin) and preloaded.
- Photos are WebP with `srcset`/`sizes`, 17-54 KB each. Below-the-fold images are lazy-loaded.
- Measured with Chrome DevTools throttling (750 kbps, 100 ms RTT, 4× CPU slowdown, mobile viewport): **full load, photos included, in about 2.2 s**.

## 6. Architecture

```
src/i18n/el.js, en.js   all copy: page, form messages and emails
src/page.js             HTML template (server-side rendered at build time)
src/styles.css          styles, mobile-first
src/app.js              calculator, form, sticky bar, copy button (vanilla JS)
src/icons.js            SVG icon sprite
lib/fleet.js            fleet, prices and the "typical €8 offer" model (single source of truth)
lib/booking.js          validation and pricing
lib/handler.js          POST /api/request logic, shared by Vercel and the local server
lib/emails.js           customer auto-reply and owner notification (HTML and text)
lib/transports.js       Google Sheet webhook, SMTP, Resend, local JSONL file
lib/photos.js           photo sources and licences
api/request.js          Vercel serverless function
server.js               local development server
build.js                renders public/index.html and public/en/index.html
apps-script/Code.gs     Google Apps Script web app that appends rows to a Sheet
public/                 fonts, images, favicon (HTML is generated)
tests/                  node:test unit tests
```

### Request flow

```
Form (app.js)
  ├─ client-side validation, with inline messages per field
  └─ POST /api/request (JSON)
        │
        ▼
lib/handler.js
  1. Spam checks: hidden honeypot field and minimum fill time (a fake success, nothing stored)
  2. Server-side validation (422 with per-field error codes)
  3. Price calculation and request number (e.g. MR-7KQ2D)
  4. Store the request: Google Sheet and/or local file
  5. Email the customer auto-reply and the owner notification
  6. 200 { ref, days, total, mailed }, or 503 if it could not be stored anywhere
```

The endpoint never reports success unless the request was actually stored (Sheet, file, or delivered owner email). On a 503 the visitor sees the WhatsApp fallback.

### Build-time checks

`build.js` fails if the Greek and English dictionaries don't have exactly the same keys and list lengths. A missing translation cannot ship.

## 7. Running locally

Requires Node.js 20 or newer. There are no dependencies to install.

```bash
npm run dev      # builds the pages, serves http://localhost:3000, rebuilds on changes
npm run build    # writes public/index.html and public/en/index.html
npm test         # unit tests
```

Local configuration uses environment variables:

```bash
LOCAL_STORE_FILE=./data/requests.jsonl \
SMTP_HOST=127.0.0.1 SMTP_PORT=1025 \
OWNER_EMAIL=bookings@example.com \
npm run dev
```

Any SMTP catcher without authentication works, e.g. Mailpit or MailHog on port 1025.

For testing error states, the local server only:

- `POST /api/request?fail=1` simulates an outage
- `POST /api/request?delay=4000` simulates a slow network

## 8. Deploying to Vercel

1. Import the repository in Vercel. `vercel.json` already sets `framework: null`, the build command `node build.js` and the output directory `public`. `api/request.js` is deployed as a serverless function.
2. Set the environment variables:

| Variable | Purpose |
|---|---|
| `SHEETS_WEBHOOK_URL` | URL of the Apps Script web app. One row per request in the Google Sheet. |
| `SHEETS_TOKEN` | Shared secret, must match the script property `TOKEN` |
| `SHEETS_SEND_MAIL` | `1` to send both emails through the Sheet owner's Gmail (MailApp), no extra provider needed |
| `RESEND_API_KEY` | Alternative email delivery through Resend |
| `MAIL_FROM` | Sender for Resend, e.g. `Meltemi Rentals <bookings@your-domain>` |
| `OWNER_EMAIL` | Where new-request notifications go |

At least one storage option (`SHEETS_WEBHOOK_URL`) must be configured. Otherwise the endpoint returns 503 by design.

### Google Sheet setup

1. Create a Google Sheet, then open **Extensions → Apps Script** and paste `apps-script/Code.gs`.
2. **Project Settings → Script properties**: add `TOKEN` with a random string, and use the same value for `SHEETS_TOKEN`.
3. **Deploy → New deployment → Web app**. Execute as: *Me*. Who has access: *Anyone*.
4. Copy the web app URL into `SHEETS_WEBHOOK_URL`, and set `SHEETS_SEND_MAIL=1` if you want emails sent from Gmail.

The script creates a sheet named `Αιτήματα` with a header row and a `Κατάσταση` (status) column set to `Νέο` (new).

## 9. Photo credits

Photos come from Wikimedia Commons. They were cropped and converted to WebP. Credits are also shown in the page footer.

| Photo | Author | Licence |
|---|---|---|
| [Fiat Panda, Greece](https://commons.wikimedia.org/wiki/File:Fiat_Panda,_Greece,_23_July_2016.jpg) | JanClaus | CC0 |
| [2020 Hyundai i10](https://commons.wikimedia.org/wiki/File:2020_Hyundai_i10_Premium_1.0.jpg) | Vauxford | CC BY-SA 4.0 |
| [Toyota Yaris Hybrid](https://commons.wikimedia.org/wiki/File:Toyota_Yaris_Hybrid_(XP210)_IMG_4912.jpg) | Alexander Migl | CC BY-SA 4.0 |
| [2014 MINI Cooper Roadster](https://commons.wikimedia.org/wiki/File:2014_MINI_Cooper_Roadster_S.png) | DiverDan1981 | CC BY-SA 4.0 |
| [2018 Dacia Duster](https://commons.wikimedia.org/wiki/File:2018_Dacia_Duster_Comfort_1.6.jpg) | Vauxford | CC BY-SA 4.0 |
| [Kefalos, Kos](https://commons.wikimedia.org/wiki/File:Kefalos_K%C3%B3s_6.jpg) | Karelj | Public domain |

## 10. Placeholder content

Reviews, rating, owner names, phone numbers, email and address are illustrative. The "€8 offer" breakdown is a model based on the brief, not data from a specific company.

## 11. Next steps with more time

- Photos of the actual fleet
- A/B test of the hero: the claim first vs. the calculator first
- Analytics events: calculator use, form start, submit, WhatsApp fallback
- Monthly pricing instead of a single high-season rate
- Real-time availability per category
- German, Italian and Dutch versions for the main markets in Kos
- Live Google reviews through the Places API
