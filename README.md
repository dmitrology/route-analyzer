# RouteDeals 🛫

*A scrape-powered deal engine that watches the **NYC ⇆ Florida** leisure corridor, flags rare flight + stay bargains, sells the package online, then routes a manual booking queue to your in-house travel-agent team.*

## 🎯 What RouteDeals Does

| Pain for travellers                                  | Our promise                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Prices swing wildly; bargain dates are hard to spot. | **Data-driven "book-now" alerts** that prove how much cheaper today is vs. normal. |
| Juggling Skyscanner + Booking + Airbnb tabs.         | **One click** shows total trip cost (flight + stay) and lets you check out.        |
| Fear the quoted fare will vanish.                    | We display a **probability-to-drop** badge *and* handle re-booking / refunds.      |

## 🗺️ Market Scope

- **Origins:** JFK, LGA, EWR
- **Destinations:** MCO, FLL, MIA, TPA  
- **Stay zones:** Orlando, Miami-Beach, Tampa–St Pete, Fort Lauderdale
- **Stay lengths:** 3, 5, 7, 14 nights
- **Horizon:** Next 90 departure days

## 🏗️ Architecture

```
Scrapers (Playwright) → Convex Database → Next.js Frontend
                     ↓
              Analytics Engine → Hot Deals → Stripe Checkout → Manual Fulfillment
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account
- Stripe account

### Installation

```bash
# Clone and install
git clone <your-repo>
cd routedeals
npm install

# Set up Convex
npx convex dev
# Follow prompts to create/link project

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

Create `.env.local` with:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOY_KEY=your_deploy_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Proxy for scraping (SmartProxy recommended)
PROXY_SERVER=http://your-proxy:port
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_password

# OpenAI for enhanced analytics (optional)
OPENAI_API_KEY=your_openai_api_key

# Resend for emails
RESEND_API_KEY=your_resend_key

# Admin credentials
ADMIN_EMAIL=admin@yourcompany.com
```

### Development

```bash
# Start Convex backend
npx convex dev

# Start Next.js frontend (in another terminal)
npm run dev
```

## 📊 Scraping Methodology

| Target                        | URL pattern                                                                                                                                          | Selector notes                                                           | Cadence                                     | Anti-bot                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------ |
| **Skyscanner flights**        | `https://www.skyscanner.com/transport/flights/{ORIG}/{DEST}/{YYYYMMDD}`                                                                              | Wait for `.Price_mainPriceContainer`; take **first result** (lowest).    | Daily, 04:00 ET per origin/dest (90 dates). | `playwright-stealth`, rotate UA; 60 sec delay between pages. |
| **Google Flights** (fallback) | `https://www.google.com/travel/flights?gl=us&hl=en#flt={ORIG}.{DEST}.{DATE}`                                                                         | Grab `div[jsname="EcHy0b"]` price if Skyscanner fails.                   | Same job; only on error.                    | Same controls.                                               |
| **Booking.com hotels**        | `https://www.booking.com/searchresults.en-gb.html?ss={ZIP}&checkin={IN}&checkout={OUT}&nflt=class%253D3%253Bclass%253D4%253Bclass%253D5&order=price` | Wait for cards, read first three `.fcab3ed991.price` spans (take *min*). | Daily, 05:00 ET.                            | 30 sec delay; residential proxy.                             |
| **Airbnb**                    | Public search w/ `items_offset=0&room_types=Entire%20home/apt&price_min=0`                                                                           | Parse JSON in `script[id="data-state"]`, compute **median nightly**.     | Tue & Fri 05:15 ET.                         | Extra 5 sec random sleep; respects robots.                   |

## 🤖 Analytics Engine

### Baseline Calculation (Holt-Winters)
- Runs nightly at 5:10 AM ET
- Uses 365-day historical data
- Calculates expected prices and delta percentages

### Rarity Computation
- Runs nightly at 5:15 AM ET  
- Creates price histograms for percentile ranking
- Assigns rarity scores (0-1, lower = rarer)

### Package Building
- Runs nightly at 5:30 AM ET
- Combines flights + hotels for all valid date ranges
- Keeps top 50 packages per origin/destination
- Flags hot deals: `deltaPct ≥ 0.15` **and** `rarity ≤ 0.1`

## 🎫 Manual Fulfillment Workflow

1. **Stripe webhook** sets `orders.status = 'paid'`
2. Admin opens **Orders Dashboard** → clicks **Start** 
3. Books flight/hotel in GDS/OTA, enters confirmation numbers
4. If price increased >$25 → auto-refund with apology email
5. **SLA:** < 24h from payment to booked

## 📱 Frontend Pages

- `/` - Dashboard with hot deals and route tracker
- `/deals` - Package finder with filters
- `/checkout/[packageId]` - Stripe checkout
- `/my-trips` - User order history
- `/admin/orders` - Staff booking interface
- `/admin/scrapes` - Scrape status monitoring

## 🔧 Scripts

```bash
# Manual scraping (development)
npx convex action scrapers:scrapeAllFlights
npx convex action scrapers:scrapeAllHotels

# Analytics
npx convex action analytics:updateBaselines
npx convex action analytics:computeRarity  
npx convex action analytics:buildPackages

# View data
npx convex query database:getPackages '{"hotDealsOnly": true}'
npx convex query database:getScrapeStatus
```

## 🎯 Success Metrics

- **Scraper success** ≥ 95% (≤ 5% CAPTCHA/403)
- **Dashboard P95** load ≤ 2s
- **Booking SLA** ≥ 98% within 24h
- **Infra cost** ≤ $50/mo

## 🚧 Roadmap

| Phase       | Weeks | Milestones                                                                |
| ----------- | ----- | ------------------------------------------------------------------------- |
| **0 Spike** | 0–1   | Playwright script scraping one JFK→MCO date, pushed to `flight_fares`.    |
| **1 MVP**   | 2–5   | All cron scrapes, baseline calc, Tracker & Finder pages, Stripe checkout. |
| **2 Beta**  | 6–9   | Alerts, Heatmap, Admin dashboard, itinerary email flow, SLA monitor.      |
| **3 v1.0**  | 10–14 | Mobile PWA, referral codes, expand to BOS ⇆ LAS corridor.                 |

## 📧 Support

- **Email:** support@routedeals.com
- **Response SLA:** 24 hours
- **Refund threshold:** Auto-refund if final cost >$25 from quoted price

## 📄 License

MIT License - see LICENSE file for details
