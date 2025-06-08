#!/usr/bin/env node

/**
 * RouteDeals Setup Script
 * 
 * This script helps populate initial test data for development.
 * Run with: node scripts/setup.js
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable is required");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Sample data for testing
const sampleFlights = [
  {
    origin: "JFK",
    dest: "MCO", 
    date: "2024-12-15",
    lowestUsd: 247,
    airline: "JetBlue",
    url: "https://www.skyscanner.com/transport/flights/jfk/mco/241215",
    expectedUsd: 320,
    deltaPct: 0.23,
    rarity: 0.08,
  },
  {
    origin: "LGA",
    dest: "FLL",
    date: "2024-12-20", 
    lowestUsd: 289,
    airline: "Delta",
    url: "https://www.skyscanner.com/transport/flights/lga/fll/241220",
    expectedUsd: 340,
    deltaPct: 0.15,
    rarity: 0.12,
  },
  {
    origin: "EWR", 
    dest: "MIA",
    date: "2024-12-22",
    lowestUsd: 312,
    airline: "United",
    url: "https://www.skyscanner.com/transport/flights/ewr/mia/241222",
    expectedUsd: 380,
    deltaPct: 0.18,
    rarity: 0.15,
  },
];

const sampleHotels = [
  {
    region: "ORL",
    checkIn: "2024-12-15",
    checkOut: "2024-12-20",
    nightlyUsd: 89,
    url: "https://www.booking.com/hotel/us/example-orlando.html",
    rarity: 0.25,
  },
  {
    region: "FLL", 
    checkIn: "2024-12-20",
    checkOut: "2024-12-25",
    nightlyUsd: 145,
    url: "https://www.booking.com/hotel/us/example-fortlauderdale.html", 
    rarity: 0.18,
  },
  {
    region: "MIA",
    checkIn: "2024-12-22", 
    checkOut: "2024-12-27",
    nightlyUsd: 167,
    url: "https://www.booking.com/hotel/us/example-miami.html",
    rarity: 0.22,
  },
];

async function populateTestData() {
  console.log("🚀 Setting up RouteDeals test data...\n");

  try {
    // Add sample flights
    console.log("✈️  Adding sample flights...");
    for (const flight of sampleFlights) {
      await client.mutation("database:saveFlight", {
        scrapedAt: Date.now(),
        ...flight,
      });
      console.log(`   Added: ${flight.origin} → ${flight.dest} ($${flight.lowestUsd})`);
    }

    // Add sample hotels  
    console.log("\n🏨 Adding sample hotels...");
    for (const hotel of sampleHotels) {
      await client.mutation("database:saveHotel", {
        scrapedAt: Date.now(),
        ...hotel,
      });
      console.log(`   Added: ${hotel.region} ${hotel.checkIn} ($${hotel.nightlyUsd}/night)`);
    }

    // Generate packages
    console.log("\n📦 Building sample packages...");
    await client.action("analytics:buildPackages");
    
    // Add sample scrape logs
    console.log("\n📊 Adding scrape status logs...");
    const scrapeTargets = [
      "JFK-MCO-2024-12-15",
      "LGA-FLL-2024-12-20", 
      "EWR-MIA-2024-12-22",
      "ORL-2024-12-15-2024-12-20",
      "FLL-2024-12-20-2024-12-25",
    ];

    for (const target of scrapeTargets) {
      await client.mutation("database:logScrape", {
        timestamp: Date.now() - Math.random() * 3600000, // Random time in last hour
        scrapeType: target.includes("ORL") || target.includes("FLL") || target.includes("MIA") ? "hotels" : "flights",
        target,
        status: Math.random() > 0.1 ? "success" : "error", // 90% success rate
        duration: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
      });
    }

    console.log("\n✅ Setup complete! You can now:");
    console.log("   • Visit http://localhost:3000 to see the dashboard");
    console.log("   • Run 'npx convex query database:getPackages' to view packages");
    console.log("   • Run 'npx convex query database:getScrapeStatus' to check scrape health");
    console.log("\n🔧 Available manual commands:");
    console.log("   • npx convex action analytics:updateBaselines");
    console.log("   • npx convex action analytics:computeRarity");
    console.log("   • npx convex action analytics:buildPackages");

  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

async function checkSetup() {
  console.log("🔍 Checking RouteDeals setup...\n");
  
  try {
    // Check packages
    const packages = await client.query("database:getPackages");
    console.log(`📦 Found ${packages.length} packages`);
    
    // Check scrape status
    const scrapeStatus = await client.query("database:getScrapeStatus");
    console.log(`📊 Scrape success rate: ${Math.round(scrapeStatus.stats.successRate * 100)}%`);
    
    // Check hot deals
    const hotDeals = await client.query("database:getPackages", { hotDealsOnly: true });
    console.log(`🔥 Found ${hotDeals.length} hot deals`);
    
    console.log("\n✅ Setup looks good!");
    
  } catch (error) {
    console.error("❌ Setup check failed:", error);
    console.log("\n💡 Try running: node scripts/setup.js --populate");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes("--populate") || args.includes("-p")) {
  populateTestData();
} else if (args.includes("--check") || args.includes("-c")) {
  checkSetup();
} else {
  console.log("🛫 RouteDeals Setup Script\n");
  console.log("Usage:");
  console.log("  node scripts/setup.js --populate   # Add sample data");  
  console.log("  node scripts/setup.js --check      # Check current setup");
  console.log("  node scripts/setup.js              # Show this help");
} 