# 🚀 Server-Based Real Web Scraping with Puppeteer

## Why Server > Serverless for Travel Scraping

### ❌ Serverless Limitations
- 15-30 second timeouts
- No persistent browser state
- Limited memory/CPU
- Easily detected by anti-bot systems
- No stealth capabilities

### ✅ Dedicated Server Benefits
- Full Chrome browser with extensions
- Stealth plugins (puppeteer-extra-plugin-stealth)
- Proxy rotation and residential IPs
- Human behavior simulation
- Persistent sessions and cookies
- No execution time limits

## 🏗️ Server Architecture Options

### Option 1: VPS with Puppeteer (Recommended)
```bash
# Ubuntu/Debian VPS setup
sudo apt update
sudo apt install -y curl wget gnupg
sudo apt install -y chromium-browser

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
npm install puppeteer-extra-plugin-anonymize-ua
npm install proxy-chain
```

### Option 2: Docker Container
```dockerfile
FROM ghcr.io/puppeteer/puppeteer:latest

# Install stealth plugins
USER pptruser
WORKDIR /home/pptruser
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .

CMD ["node", "scraper.js"]
```

## 🕵️ Real Scraping Implementation

### Travel Site Scraper with Stealth
```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AnonymizeUA = require('puppeteer-extra-plugin-anonymize-ua');

// Add stealth plugin
puppeteer.use(StealthPlugin());
puppeteer.use(AnonymizeUA());

class RealTravelScraper {
  constructor() {
    this.browser = null;
    this.proxies = [
      'http://proxy1:8080',
      'http://proxy2:8080',
      // Add residential proxy list
    ];
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false, // Start with false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--proxy-server=' + this.getRandomProxy()
      ]
    });
  }

  async scrapeKayakFlights(origin, dest, date) {
    const page = await this.browser.newPage();
    
    // Set realistic viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Block images/css for faster loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if(req.resourceType() == 'stylesheet' || req.resourceType() == 'image'){
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      // Navigate to Kayak
      await page.goto('https://www.kayak.com/flights', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Human-like delays
      await this.humanDelay(2000, 4000);

      // Fill search form
      await page.type('[data-testid="origin-airport-display-name"]', origin, {delay: 100});
      await this.humanDelay(500, 1000);
      
      await page.type('[data-testid="destination-airport-display-name"]', dest, {delay: 100});
      await this.humanDelay(500, 1000);

      // Set date
      await page.click('[data-testid="depart-input"]');
      await this.humanDelay(1000, 2000);
      
      // Navigate calendar (implement date selection logic)
      await this.selectDate(page, date);
      
      // Search
      await page.click('[data-testid="submit-button"]');
      await page.waitForSelector('.flight-card', { timeout: 30000 });

      // Extract flight data
      const flights = await page.evaluate(() => {
        const flightCards = document.querySelectorAll('.flight-card');
        return Array.from(flightCards).map(card => {
          const price = card.querySelector('.price-text')?.textContent;
          const airline = card.querySelector('.airline-name')?.textContent;
          const times = card.querySelector('.times')?.textContent;
          const duration = card.querySelector('.duration')?.textContent;
          
          return {
            price: parseInt(price?.replace(/\D/g, '')),
            airline,
            times,
            duration,
            source: 'Kayak',
            url: window.location.href,
            scrapedAt: Date.now()
          };
        });
      });

      return flights.filter(f => f.price && f.price > 0);

    } catch (error) {
      console.error('Kayak scraping error:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  async scrapeGoogleFlights(origin, dest, date) {
    const page = await this.browser.newPage();
    
    try {
      const url = `https://www.google.com/travel/flights?q=Flights%20to%20${dest}%20from%20${origin}%20on%20${date}`;
      await page.goto(url, { waitUntil: 'networkidle0' });

      await this.humanDelay(3000, 5000);

      // Wait for results
      await page.waitForSelector('[data-testid="flight-offer"]', { timeout: 20000 });

      const flights = await page.evaluate(() => {
        const offers = document.querySelectorAll('[data-testid="flight-offer"]');
        return Array.from(offers).map(offer => {
          const priceEl = offer.querySelector('[data-gs="CjRJUlAq"]');
          const airlineEl = offer.querySelector('[data-testid="airline-name"]');
          const timeEl = offer.querySelector('[data-testid="departure-time"]');
          
          return {
            price: parseInt(priceEl?.textContent?.replace(/\D/g, '')),
            airline: airlineEl?.textContent,
            departureTime: timeEl?.textContent,
            source: 'Google Flights',
            url: window.location.href,
            scrapedAt: Date.now()
          };
        });
      });

      return flights.filter(f => f.price && f.price > 0);

    } catch (error) {
      console.error('Google Flights error:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  async humanDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  getRandomProxy() {
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = RealTravelScraper;
```

## 🛡️ Anti-Detection Strategies

### 1. Residential Proxies
```javascript
const proxyProviders = {
  // Rotate through multiple providers
  brightdata: 'http://username:password@proxy.brightdata.com:8080',
  smartproxy: 'http://username:password@gate.smartproxy.com:10000',
  oxylabs: 'http://username:password@pr.oxylabs.io:7777'
};
```

### 2. Browser Fingerprint Randomization
```javascript
// Randomize user agents, screen resolution, timezone
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  // Add more real user agents
];

await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
```

### 3. Human Behavior Simulation
```javascript
// Realistic mouse movements
await page.mouse.move(100, 100);
await page.mouse.move(200, 200, {steps: 10});

// Random scrolling
await page.evaluate(() => {
  window.scrollBy(0, Math.floor(Math.random() * 500));
});

// Random delays between actions
await humanDelay(1000, 3000);
```

## 🏠 Hosting Options

### Best VPS Providers for Scraping
1. **DigitalOcean** - $5-10/month, good performance
2. **Linode** - Similar pricing, excellent uptime  
3. **AWS EC2** - Scalable, but more expensive
4. **Hetzner** - Cheap European hosting
5. **Vultr** - Global locations

### Docker Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  scraper:
    build: .
    environment:
      - PROXY_URL=your-proxy-url
      - CONVEX_URL=your-convex-url
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## 📊 Integration with Convex

### Send Real Data to Convex
```javascript
// In your scraper
const { ConvexHttpClient } = require('convex/browser');

async function sendToConvex(scrapedData) {
  const convex = new ConvexHttpClient(process.env.CONVEX_URL);
  
  for (const flight of scrapedData) {
    await convex.mutation(api.database.insertScrapeResult, {
      type: 'flight',
      route: `${flight.origin}-${flight.dest}`,
      price: flight.price,
      airline: flight.airline,
      source: flight.source,
      url: flight.url,
      scrapedAt: Date.now(),
      metadata: {
        realDataOnly: true,
        enhancedDataAvailable: true,
        origin: flight.origin,
        dest: flight.dest
      }
    });
  }
}
```

## ⚖️ Legal Considerations

### ✅ Best Practices
- Respect robots.txt
- Add delays between requests (2-5 seconds)
- Don't overload servers
- Use data for personal/research only
- Check ToS of each site

### 🚨 Risks
- IP blocking
- Legal action (rare for personal use)
- CAPTCHA challenges
- Rate limiting

## 🎯 Success Tips

1. **Start Small** - Test one route/date first
2. **Monitor Success Rate** - Track scraping failures  
3. **Rotate Everything** - IPs, user agents, timing
4. **Handle Failures** - Retry logic, fallback sources
5. **Stay Updated** - Sites change layouts frequently

## 💰 Cost Estimate

- VPS: $10-20/month
- Residential Proxies: $50-100/month
- Total: **$60-120/month** for real data

**Much better than fake data for a real travel platform!** 