# 🚀 GitHub Codespaces Real Web Scraping Setup

## Why Codespaces > Serverless for Real Scraping

✅ **Full Linux environment** - No 15-second timeouts  
✅ **Chrome + Puppeteer** - Real browser automation  
✅ **Stealth plugins** - Bypass anti-bot detection  
✅ **Persistent sessions** - Maintain cookies & state  
✅ **Free 60 hours/month** - Perfect for testing  
✅ **No synthetic data** - 100% real travel prices  

---

## 🎯 Quick Start

### 1. **Create Codespace**
```bash
# In your GitHub repo, click: Code → Codespaces → Create codespace
# This will automatically run .devcontainer/setup.sh
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Test Real Scraper**
```bash
npm run scraper:test
```

### 4. **Start Real Scraper Server**
```bash
npm run scraper:start
```

### 5. **Start Your App**
```bash
# Terminal 1: Convex
npx convex dev --typecheck=disable

# Terminal 2: Next.js
npm run dev
```

---

## 🔧 API Endpoints

Once your scraper server is running on port 8080:

### **Start Scraping**
```bash
curl -X POST http://localhost:8080/api/start
```

### **Check Status**
```bash
curl http://localhost:8080/api/status
```

### **Manual Scrape**
```bash
curl -X POST http://localhost:8080/api/scrape
```

### **Stop Scraping**
```bash
curl -X POST http://localhost:8080/api/stop
```

---

## 🎯 What You Get

### **Real Flight Data From:**
- ✅ Kayak.com - Live flight prices
- ✅ Real airlines (JetBlue, Delta, American, etc.)
- ✅ Actual departure/arrival times
- ✅ Real flight numbers & durations
- ✅ Current market prices

### **Real Hotel Data From:**
- ✅ Booking.com - Live hotel prices  
- ✅ Real hotel names & ratings
- ✅ Actual guest reviews & star ratings
- ✅ Real availability & pricing
- ✅ Current market rates

---

## 🛡️ Anti-Bot Protection

The scraper includes multiple stealth techniques:

- **Puppeteer Stealth Plugin** - Hides automation signatures
- **Real User Agents** - Mimics actual browsers  
- **Human Delays** - Random timing between actions
- **Image/Font Blocking** - Faster loading
- **Proxy Support** - IP rotation capability

---

## ⚙️ Configuration

### **Environment Variables**
```bash
# Optional: Add to .env.local
SCRAPER_HEADLESS=true          # Set to false for debugging
SCRAPER_DELAY_MIN=5000         # Min delay between requests (ms)
SCRAPER_DELAY_MAX=10000        # Max delay between requests (ms)
SCRAPER_TIMEOUT=30000          # Request timeout (ms)
CONVEX_SITE_URL=your_site_url  # For sending data to Convex
```

### **Proxy Configuration**
Edit `scrapers/real/real_scraper.ts` to add your proxies:
```typescript
this.proxyList = [
  'http://proxy1:port',
  'http://proxy2:port',
  // Add your proxy servers
];
```

---

## 📊 Data Flow

```
Codespaces → Real Websites → Puppeteer → Your Database
     ↓            ↓             ↓            ↓
  Chrome      Kayak.com    Stealth Mode   Convex
            Booking.com   Anti-Detection   Real Prices
```

---

## 🚨 Best Practices

### **Respectful Scraping**
- ✅ 5-10 second delays between requests
- ✅ Scrape during off-peak hours  
- ✅ Limit concurrent requests
- ✅ Use proxy rotation
- ✅ Monitor for rate limiting

### **Error Handling**
- ✅ Graceful fallbacks when sites block
- ✅ Retry logic with exponential backoff
- ✅ Log all errors for debugging
- ✅ Graceful degradation

---

## 🔍 Debugging

### **Enable Visual Mode**
```typescript
// In real_scraper.ts, change:
headless: false  // Shows browser window
```

### **View Logs**
```bash
# Real-time logs
tail -f logs/scraper.log

# Server logs  
npm run scraper:dev  # Auto-restart on changes
```

### **Test Individual Components**
```bash
# Test flight scraping only
npm run scraper:test

# Test with specific route
npx ts-node -e "
const { RealTravelScraper } = require('./scrapers/real/real_scraper');
const scraper = new RealTravelScraper();
scraper.initialize()
  .then(() => scraper.scrapeKayakFlights('JFK', 'MCO', '2025-01-15'))
  .then(console.log)
  .finally(() => scraper.close());
"
```

---

## 🎖️ Success Metrics

### **Real Data Indicators**
- ✅ Price variations > ±$50 (not fixed $51)
- ✅ Multiple airlines per route
- ✅ Realistic flight times & durations  
- ✅ Actual hotel names & ratings
- ✅ Current market pricing

### **Scraping Health**
- ✅ Success rate > 80%
- ✅ Response times < 30 seconds
- ✅ No CAPTCHA challenges
- ✅ Varied pricing data

---

## 🆘 Troubleshooting

### **Chrome Issues**
```bash
# Install Chrome dependencies
sudo apt-get update
sudo apt-get install -y google-chrome-stable
```

### **Permission Errors**
```bash
chmod +x .devcontainer/setup.sh
sudo chown -R node:node /workspaces
```

### **Memory Issues**
```bash
# Monitor memory usage
htop
# Restart scraper if needed
npm run scraper:stop && npm run scraper:start
```

---

## 🎉 You're Ready!

Your GitHub Codespace is now configured for **real web scraping**:

1. ✅ **No more synthetic data**
2. ✅ **Actual travel prices** 
3. ✅ **Real flight/hotel details**
4. ✅ **Stealth scraping capability**
5. ✅ **60 hours free/month**

**Next:** Run `npm run scraper:start` and watch real data flow in! 🚀 