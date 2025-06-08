import express from 'express';
import { RealTravelScraper } from './real_scraper';

const app = express();
const PORT = process.env.PORT || 8080;

let scraper: RealTravelScraper | null = null;
let isRunning = false;

// Routes for scraping
const routes = [
  { origin: 'JFK', dest: 'MCO' },
  { origin: 'LGA', dest: 'MIA' },
  { origin: 'EWR', dest: 'TPA' },
  { origin: 'JFK', dest: 'FLL' },
];

const regions = ['MIA', 'MCO', 'TPA', 'FLL'];

app.use(express.json());

// Initialize scraper
app.post('/api/start', async (req, res) => {
  try {
    if (isRunning) {
      return res.json({ status: 'already_running', message: 'Scraper is already running' });
    }

    scraper = new RealTravelScraper();
    await scraper.initialize();
    isRunning = true;

    // Start continuous scraping
    startContinuousScraping();

    res.json({ 
      status: 'started', 
      message: 'Real travel scraper started successfully',
      routes: routes.length,
      regions: regions.length
    });

  } catch (error) {
    console.error('Failed to start scraper:', error);
    res.status(500).json({ status: 'error', message: 'Failed to start scraper' });
  }
});

// Stop scraper
app.post('/api/stop', async (req, res) => {
  try {
    if (scraper) {
      await scraper.close();
      scraper = null;
    }
    isRunning = false;

    res.json({ status: 'stopped', message: 'Scraper stopped successfully' });

  } catch (error) {
    console.error('Failed to stop scraper:', error);
    res.status(500).json({ status: 'error', message: 'Failed to stop scraper' });
  }
});

// Manual scrape trigger
app.post('/api/scrape', async (req, res) => {
  try {
    if (!scraper || !isRunning) {
      return res.status(400).json({ status: 'error', message: 'Scraper not running. Start it first.' });
    }

    console.log('🎯 Manual scrape triggered');
    const results = await performScraping();

    res.json({ 
      status: 'success', 
      message: 'Manual scraping completed',
      results: {
        flights: results.flights.length,
        hotels: results.hotels.length,
        total: results.flights.length + results.hotels.length
      }
    });

  } catch (error) {
    console.error('Manual scraping failed:', error);
    res.status(500).json({ status: 'error', message: 'Manual scraping failed' });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: isRunning ? 'running' : 'stopped',
    scraper_initialized: scraper !== null,
    routes: routes.length,
    regions: regions.length,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

async function performScraping() {
  if (!scraper) throw new Error('Scraper not initialized');

  const flights = [];
  const hotels = [];

  console.log('🚀 Starting real data scraping cycle...');

  // Scrape flights
  for (const route of routes) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];

      console.log(`🛫 Scraping ${route.origin} → ${route.dest} for ${date}`);
      const flightResults = await scraper.scrapeKayakFlights(route.origin, route.dest, date);
      flights.push(...flightResults);

      // Send to Convex (if you have the endpoint configured)
      await sendToConvex('flights', flightResults);

      // Delay between requests to be respectful
      await delay(5000, 10000);

    } catch (error) {
      console.error(`❌ Flight scraping failed for ${route.origin}-${route.dest}:`, error);
    }
  }

  // Scrape hotels
  for (const region of regions) {
    try {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 7);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 10);

      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];

      console.log(`🏨 Scraping hotels in ${region} for ${checkInStr} → ${checkOutStr}`);
      const hotelResults = await scraper.scrapeBookingHotels(region, checkInStr, checkOutStr);
      hotels.push(...hotelResults);

      // Send to Convex
      await sendToConvex('hotels', hotelResults);

      // Delay between requests
      await delay(5000, 10000);

    } catch (error) {
      console.error(`❌ Hotel scraping failed for ${region}:`, error);
    }
  }

  console.log(`✅ Scraping cycle complete: ${flights.length} flights, ${hotels.length} hotels`);
  return { flights, hotels };
}

async function sendToConvex(type: string, data: any[]) {
  // You can implement this to send data to your Convex backend
  // For now, just log the data
  console.log(`📤 Would send ${data.length} ${type} records to Convex`);
  
  // Example implementation:
  /*
  for (const item of data) {
    try {
      const response = await fetch(`${process.env.CONVEX_SITE_URL}/api/scrape-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data: item,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send to Convex:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending to Convex:', error);
    }
  }
  */
}

async function startContinuousScraping() {
  console.log('🔄 Starting continuous scraping (every 2 hours)...');
  
  // Run immediately
  setTimeout(async () => {
    try {
      await performScraping();
    } catch (error) {
      console.error('❌ Initial scraping failed:', error);
    }
  }, 5000); // Wait 5 seconds before first run

  // Then run every 2 hours
  setInterval(async () => {
    if (isRunning && scraper) {
      try {
        console.log('⏰ Scheduled scraping cycle starting...');
        await performScraping();
      } catch (error) {
        console.error('❌ Scheduled scraping failed:', error);
      }
    }
  }, 2 * 60 * 60 * 1000); // 2 hours
}

function delay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down scraper server...');
  if (scraper) {
    await scraper.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down scraper server...');
  if (scraper) {
    await scraper.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Real Travel Scraper Server running on port ${PORT}`);
  console.log(`📍 Endpoints:`);
  console.log(`   POST /api/start - Start scraping`);
  console.log(`   POST /api/stop - Stop scraping`);
  console.log(`   POST /api/scrape - Manual scrape`);
  console.log(`   GET /api/status - Check status`);
  console.log(`   GET /health - Health check`);
  console.log(`🎯 Ready to scrape REAL travel data!`);
}); 