"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Define result type for consistency
type ScrapeResult = {
  success: boolean;
  price: number;
  airline?: string;
  url: string;
  
  // Flight fields
  flightNumber?: string;
  aircraftType?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  stops?: number;
  stopCities?: string[];
  layoverDuration?: string;
  fareType?: string;
  seatsRemaining?: number;
  baggageIncluded?: string;
  refundable?: boolean;
  changeFee?: number;
  bookingClass?: string;
  lastSaleDate?: string;
  
  // Hotel fields
  hotelName?: string;
  starRating?: number;
  hotelType?: string;
  brand?: string;
  distanceFromAirport?: string;
  distanceFromCenter?: string;
  amenities?: string[];
  neighborhood?: string;
  roomType?: string;
  maxOccupancy?: number;
  roomSize?: string;
  bedType?: string;
  cancellationPolicy?: string;
  paymentOptions?: string;
  mealsIncluded?: string;
  taxesIncluded?: boolean;
  guestRating?: number;
  reviewCount?: number;
  recentHighlights?: string[];
  lastBookedTime?: string;
  roomsRemaining?: number;
  popularProperty?: boolean;
};

export const runFlightScraper = action({
  args: {
    origin: v.string(),
    dest: v.string(),
    date: v.string(),
  },
  handler: async (ctx, { origin, dest, date }): Promise<ScrapeResult | null> => {
    console.log(`🛫 Running REAL flight scraper: ${origin} → ${dest} on ${date}`);
    
    // Validate required parameters
    if (!origin || !dest || !date) {
      throw new Error("Missing required parameters: origin, dest, and date are required");
    }
    
    try {
      // Try multiple REAL data sources in order of preference
      let result = null;
      
      // 1. Try Amadeus API (best coverage, real airline data)
      try {
        result = await ctx.runAction(api.real_scraper.scrapeAmadeusFlights, {
          origin,
          dest,
          date
        });
        if (result && result.price > 0) {
          console.log(`✅ Got REAL Amadeus data: $${result.price}`);
        }
      } catch (error) {
        console.log(`⚠️ Amadeus failed: ${error}`);
      }
      
      // 2. Fallback to Kayak via SerpAPI
      if (!result || !result.price) {
        try {
          result = await ctx.runAction(api.real_scraper.scrapeKayakFlights, {
            origin,
            dest,
            date
          });
          if (result && result.price > 0) {
            console.log(`✅ Got REAL Kayak data: $${result.price}`);
          }
        } catch (error) {
          console.log(`⚠️ Kayak failed: ${error}`);
        }
      }
      
      // 3. Fallback to Expedia API
      if (!result || !result.price) {
        try {
          result = await ctx.runAction(api.real_scraper.scrapeExpediaFlights, {
            origin,
            dest,
            date
          });
          if (result && result.price > 0) {
            console.log(`✅ Got REAL Expedia data: $${result.price}`);
          }
        } catch (error) {
          console.log(`⚠️ Expedia failed: ${error}`);
        }
      }

      // If no real data available, return null - DON'T store anything
      if (!result || !result.price || result.price <= 0) {
        console.log(`❌ NO REAL flight data available for ${origin}-${dest} on ${date} - skipping storage`);
        return null;
      }

      // Only store REAL data with realDataOnly flag
      await ctx.runMutation(api.database.storeScrapeResult, {
        type: "flight",
        route: `${origin}-${dest}`,
        date,
        price: result.price,
        source: result.source || "RealData",
        url: result.url,
        
        // Enhanced flight data from REAL scraping
        airline: result.airline,
        flightNumber: result.flightNumber,
        aircraftType: result.aircraftType,
        
        // Time & Schedule
        departureTime: result.departureTime,
        arrivalTime: result.arrivalTime,
        duration: result.duration,
        
        // Route Details
        stops: result.stops,
        stopCities: result.stopCities,
        layoverDuration: result.layoverDuration,
        
        // Booking Details
        fareType: result.fareType,
        seatsRemaining: result.seatsRemaining,
        baggageIncluded: result.baggageIncluded,
        refundable: result.refundable,
        changeFee: result.changeFee,
        
        // Additional Context
        bookingClass: result.bookingClass,
        lastSaleDate: result.lastSaleDate,
        
        // REAL data metadata
        metadata: {
          origin,
          dest,
          realDataOnly: true, // Critical flag - NO SYNTHETIC DATA
          enhancedDataAvailable: true,
          dataSource: result.metadata?.realDataSource || "UNKNOWN",
          dataType: result.metadata?.dataType || "LIVE_DATA"
        }
      });

      console.log(`✅ Stored REAL flight data: ${origin}-${dest} $${result.price} from ${result.source}`);
      return result;
      
    } catch (error) {
      console.error('Real flight scraper error:', error);
      // DON'T store failed attempts - they corrupt statistical analysis
      return null;
    }
  },
});

export const runHotelScraper = action({
  args: {
    region: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
  },
  handler: async (ctx, { region, checkIn, checkOut }): Promise<ScrapeResult | null> => {
    console.log(`🏨 Running REAL hotel scraper: ${region} ${checkIn} → ${checkOut}`);
    
    // Validate required parameters
    if (!region || !checkIn || !checkOut) {
      throw new Error("Missing required parameters: region, checkIn, and checkOut are required");
    }
    
    try {
      // Try REAL hotel data sources
      let result = null;
      
      // 1. Try Booking.com API (best hotel coverage)
      try {
        result = await ctx.runAction(api.real_scraper.scrapeBookingHotels, {
          region,
          checkIn,
          checkOut
        });
        if (result && result.price > 0) {
          console.log(`✅ Got REAL Booking.com data: $${result.price}/night`);
        }
      } catch (error) {
        console.log(`⚠️ Booking.com failed: ${error}`);
      }

      // If no real data available, return null - DON'T store anything
      if (!result || !result.price || result.price <= 0) {
        console.log(`❌ NO REAL hotel data available for ${region} ${checkIn}-${checkOut} - skipping storage`);
        return null;
      }

      // Only store REAL data with realDataOnly flag
      await ctx.runMutation(api.database.storeScrapeResult, {
        type: "hotel",
        route: region,
        date: checkIn,
        price: result.price,
        source: result.source || "RealData",
        url: result.url,
        
        // Enhanced hotel data from REAL scraping
        hotelName: result.hotelName,
        starRating: result.starRating,
        hotelType: result.hotelType,
        brand: result.brand,
        distanceFromAirport: result.distanceFromAirport,
        distanceFromCenter: result.distanceFromCenter,
        amenities: result.amenities,
        neighborhood: result.neighborhood,
        roomType: result.roomType,
        maxOccupancy: result.maxOccupancy,
        roomSize: result.roomSize,
        bedType: result.bedType,
        cancellationPolicy: result.cancellationPolicy,
        paymentOptions: result.paymentOptions,
        mealsIncluded: result.mealsIncluded,
        taxesIncluded: result.taxesIncluded,
        guestRating: result.guestRating,
        reviewCount: result.reviewCount,
        recentHighlights: result.recentHighlights,
        lastBookedTime: result.lastBookedTime,
        roomsRemaining: result.roomsRemaining,
        popularProperty: result.popularProperty,
        
        metadata: {
          region,
          checkIn,
          checkOut,
          nights: Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)),
          realDataOnly: true, // Critical flag - NO SYNTHETIC DATA
          enhancedHotelDataAvailable: true,
          dataSource: result.metadata?.realDataSource || "UNKNOWN",
          dataType: result.metadata?.dataType || "LIVE_DATA"
        }
      });

      console.log(`✅ Stored REAL hotel data: ${region} $${result.price}/night from ${result.source}`);
      return result;
      
    } catch (error) {
      console.error('Real hotel scraper error:', error);
      // DON'T store failed attempts - they corrupt statistical analysis
      return null;
    }
  },
});

type DailyScraperResult = {
  success: boolean;
  totalAttempts: number;
  realDataCount: number;
  results: Array<{
    type: string;
    route: string;
    date?: string;
    result?: ScrapeResult | null;
    error?: string;
  }>;
};

export const runDailyScraper = action({
  args: {},
  handler: async (ctx): Promise<DailyScraperResult> => {
    console.log("🔄 Running daily scraper for REAL data ONLY - NO SYNTHETIC DATA");
    
    const today = new Date();
    const routes = [
      { origin: "JFK", dest: "MCO" },
      { origin: "JFK", dest: "FLL" },
      { origin: "LGA", dest: "MIA" },
      { origin: "EWR", dest: "TPA" }
    ];
    
    const results: DailyScraperResult['results'] = [];
    let realDataCount = 0;
    
    for (const route of routes) {
      try {
        // Scrape flights for next 7 days
        for (let i = 1; i <= 7; i++) {
          const scrapeDate = new Date(today);
          scrapeDate.setDate(today.getDate() + i);
          const dateStr = scrapeDate.toISOString().split('T')[0];
          
          const flightResult = await ctx.runAction(api.scrapers.runFlightScraper, {
            origin: route.origin,
            dest: route.dest,
            date: dateStr
          });
          
          if (flightResult) {
            realDataCount++;
            console.log(`✅ REAL flight data: ${route.origin}-${route.dest} $${flightResult.price} (${flightResult.source})`);
          } else {
            console.log(`❌ No REAL flight data: ${route.origin}-${route.dest} on ${dateStr}`);
          }
          
          results.push({ 
            type: 'flight', 
            route: `${route.origin}-${route.dest}`, 
            date: dateStr, 
            result: flightResult 
          });
          
          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Scrape hotels for the destination region
        const hotelCheckIn = new Date(today);
        hotelCheckIn.setDate(today.getDate() + 1);
        const hotelCheckOut = new Date(hotelCheckIn);
        hotelCheckOut.setDate(hotelCheckIn.getDate() + 3);
        
        const hotelResult = await ctx.runAction(api.scrapers.runHotelScraper, {
          region: route.dest,
          checkIn: hotelCheckIn.toISOString().split('T')[0],
          checkOut: hotelCheckOut.toISOString().split('T')[0]
        });
        
        if (hotelResult) {
          realDataCount++;
          console.log(`✅ REAL hotel data: ${route.dest} $${hotelResult.price}/night (${hotelResult.source})`);
        } else {
          console.log(`❌ No REAL hotel data: ${route.dest}`);
        }
        
        results.push({ type: 'hotel', route: route.dest, result: hotelResult });
        
        // Add delay between hotel requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error scraping route ${route.origin}-${route.dest}:`, error);
        results.push({ 
          type: 'error', 
          route: `${route.origin}-${route.dest}`, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    console.log(`📊 Daily REAL data scraper completed: ${realDataCount} REAL data points collected out of ${results.length} attempts`);
    console.log(`🎯 ZERO synthetic data generated - 100% real market data only`);
    
    return {
      success: true,
      totalAttempts: results.length,
      realDataCount,
      results
    };
  },
});

 