"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// REAL TRAVEL DATA SOURCES - NO SYNTHETIC DATA

/**
 * AMADEUS API Integration - Real airline pricing
 * Free tier: 2000 calls/month
 * Registration: https://developers.amadeus.com/
 */
export const scrapeAmadeusFlights = action({
  args: {
    origin: v.string(),
    dest: v.string(), 
    date: v.string(),
  },
  handler: async (ctx, { origin, dest, date }) => {
    console.log(`🛫 REAL Amadeus API scrape: ${origin} → ${dest} on ${date}`);
    
    const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
    const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;
    
    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
      console.error("❌ Missing Amadeus API credentials");
      return null;
    }
    
    try {
      // Step 1: Get access token
      const tokenResponse = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`
      });
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      // Step 2: Search real flights
      const flightResponse = await fetch(
        `https://api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${dest}&departureDate=${date}&adults=1&max=5`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const flightData = await flightResponse.json();
      
      if (!flightData.data || flightData.data.length === 0) {
        console.log(`❌ No real flights found: ${origin}-${dest} on ${date}`);
        return null;
      }
      
      // Extract the cheapest flight
      const cheapestFlight = flightData.data[0];
      const price = parseFloat(cheapestFlight.price.total);
      const currency = cheapestFlight.price.currency;
      
      // Convert to USD if needed
      const usdPrice = currency === 'USD' ? price : await convertToUSD(price, currency);
      
      const airline = cheapestFlight.itineraries[0].segments[0].carrierCode;
      const flightNumber = `${airline}${cheapestFlight.itineraries[0].segments[0].number}`;
      const departure = cheapestFlight.itineraries[0].segments[0].departure;
      const arrival = cheapestFlight.itineraries[0].segments[0].arrival;
      
      console.log(`✅ REAL Amadeus flight: ${airline} ${flightNumber} - $${usdPrice}`);
      
      return {
        type: "flight",
        route: `${origin}-${dest}`,
        date,
        price: usdPrice,
        source: "Amadeus API",
        url: `https://amadeus.com/flights/${origin}-${dest}/${date}`,
        scrapedAt: Date.now(),
        
        // REAL flight details from Amadeus
        airline: airline,
        flightNumber: flightNumber,
        departureTime: departure.at.split('T')[1].substring(0, 5),
        arrivalTime: arrival.at.split('T')[1].substring(0, 5),
        duration: cheapestFlight.itineraries[0].duration.replace('PT', '').toLowerCase(),
        stops: cheapestFlight.itineraries[0].segments.length - 1,
        
        metadata: {
          origin,
          dest,
          realDataSource: "AMADEUS_API",
          dataType: "LIVE_AIRLINE_DATA"
        }
      };
      
    } catch (error) {
      console.error('❌ Amadeus API error:', error);
      return null;
    }
  }
});

/**
 * Booking.com API Integration - Real hotel pricing  
 * Rapid API: https://rapidapi.com/tipsters/api/booking-com/
 */
export const scrapeBookingHotels = action({
  args: {
    region: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
  },
  handler: async (ctx, { region, checkIn, checkOut }) => {
    console.log(`🏨 REAL Booking.com API scrape: ${region} ${checkIn} → ${checkOut}`);
    
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    
    if (!RAPIDAPI_KEY) {
      console.error("❌ Missing RapidAPI key for Booking.com");
      return null;
    }
    
    try {
      // Map region to destination IDs (you'll need to look these up)
      const destIds: Record<string, string> = {
        'MCO': '-553173',  // Orlando
        'MIA': '-1436612', // Miami
        'FLL': '-1436610', // Fort Lauderdale  
        'TPA': '-1436605', // Tampa
      };
      
      const destId = destIds[region];
      if (!destId) {
        console.error(`❌ Unknown region: ${region}`);
        return null;
      }
      
      const response = await fetch(`https://booking-com.p.rapidapi.com/v1/hotels/search?dest_id=${destId}&dest_type=city&checkin_date=${checkIn}&checkout_date=${checkOut}&adults_number=2&order_by=price&filter_by_currency=USD&room_number=1&units=metric`, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });
      
      const hotelData = await response.json();
      
      if (!hotelData.result || hotelData.result.length === 0) {
        console.log(`❌ No real hotels found: ${region} ${checkIn}-${checkOut}`);
        return null;
      }
      
      // Get the cheapest available hotel
      const cheapestHotel = hotelData.result[0];
      const pricePerNight = cheapestHotel.min_total_price / calculateNights(checkIn, checkOut);
      
      console.log(`✅ REAL Booking.com hotel: ${cheapestHotel.hotel_name} - $${pricePerNight}/night`);
      
      return {
        type: "hotel",
        route: region,
        date: checkIn,
        price: pricePerNight,
        source: "Booking.com API",
        url: cheapestHotel.url,
        scrapedAt: Date.now(),
        
        // REAL hotel details from Booking.com
        hotelName: cheapestHotel.hotel_name,
        starRating: cheapestHotel.class,
        guestRating: cheapestHotel.review_score,
        reviewCount: cheapestHotel.review_nr,
        neighborhood: cheapestHotel.district,
        
        metadata: {
          region,
          checkIn,
          checkOut,
          realDataSource: "BOOKING_COM_API",
          dataType: "LIVE_HOTEL_DATA"
        }
      };
      
    } catch (error) {
      console.error('❌ Booking.com API error:', error);
      return null;
    }
  }
});

/**
 * Kayak Flights API (SerpAPI) - Real flight scraping
 * https://serpapi.com/kayak-flights-api
 */
export const scrapeKayakFlights = action({
  args: {
    origin: v.string(),
    dest: v.string(),
    date: v.string(),
  },
  handler: async (ctx, { origin, dest, date }) => {
    console.log(`🛫 REAL Kayak scrape via SerpAPI: ${origin} → ${dest} on ${date}`);
    
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    
    if (!SERPAPI_KEY) {
      console.error("❌ Missing SerpAPI key");
      return null;
    }
    
    try {
      const response = await fetch(`https://serpapi.com/search.json?engine=kayak_flights&departure_id=${origin}&arrival_id=${dest}&outbound_date=${date}&type=1&api_key=${SERPAPI_KEY}`);
      
      const kayakData = await response.json();
      
      if (!kayakData.best_flights || kayakData.best_flights.length === 0) {
        console.log(`❌ No real Kayak flights found: ${origin}-${dest} on ${date}`);
        return null;
      }
      
      const bestFlight = kayakData.best_flights[0];
      const price = bestFlight.price;
      
      console.log(`✅ REAL Kayak flight: ${bestFlight.airline} - $${price}`);
      
      return {
        type: "flight",
        route: `${origin}-${dest}`,
        date,
        price: price,
        source: "Kayak (SerpAPI)",
        url: bestFlight.link,
        scrapedAt: Date.now(),
        
        // REAL flight details from Kayak
        airline: bestFlight.airline,
        departureTime: bestFlight.departure_time,
        arrivalTime: bestFlight.arrival_time,
        duration: bestFlight.duration,
        stops: bestFlight.stops,
        
        metadata: {
          origin,
          dest,
          realDataSource: "KAYAK_SERPAPI",
          dataType: "LIVE_FLIGHT_SCRAPE"
        }
      };
      
    } catch (error) {
      console.error('❌ Kayak SerpAPI error:', error);
      return null;
    }
  }
});

// Helper functions
async function convertToUSD(amount: number, fromCurrency: string): Promise<number> {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const data = await response.json();
    return amount * data.rates.USD;
  } catch {
    return amount; // Fallback if conversion fails
  }
}

function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Expedia API Integration - Real travel data
 * Rapid API: https://rapidapi.com/tipsters/api/expedia/
 */
export const scrapeExpediaFlights = action({
  args: {
    origin: v.string(),
    dest: v.string(),
    date: v.string(),
  },
  handler: async (ctx, { origin, dest, date }) => {
    console.log(`🛫 REAL Expedia API scrape: ${origin} → ${dest} on ${date}`);
    
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    
    if (!RAPIDAPI_KEY) {
      console.error("❌ Missing RapidAPI key for Expedia");
      return null;
    }
    
    try {
      const response = await fetch(`https://expedia-com.p.rapidapi.com/flights/search?fromId=${origin}&toId=${dest}&departDate=${date}&itinerary=ONE_WAY&sort=PRICE_INCREASING&adult=1`, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'expedia-com.p.rapidapi.com'
        }
      });
      
      const expediaData = await response.json();
      
      if (!expediaData.data || !expediaData.data.flights || expediaData.data.flights.length === 0) {
        console.log(`❌ No real Expedia flights found: ${origin}-${dest} on ${date}`);
        return null;
      }
      
      const cheapestFlight = expediaData.data.flights[0];
      const price = cheapestFlight.price.totalPrice;
      
      console.log(`✅ REAL Expedia flight: ${cheapestFlight.segments[0].legs[0].operatingCarrier.name} - $${price}`);
      
      return {
        type: "flight",
        route: `${origin}-${dest}`,
        date,
        price: price,
        source: "Expedia API",
        url: cheapestFlight.purchaseLink,
        scrapedAt: Date.now(),
        
        // REAL flight details from Expedia
        airline: cheapestFlight.segments[0].legs[0].operatingCarrier.name,
        flightNumber: cheapestFlight.segments[0].legs[0].flightNumber,
        departureTime: cheapestFlight.segments[0].legs[0].departureTime,
        arrivalTime: cheapestFlight.segments[0].legs[0].arrivalTime,
        
        metadata: {
          origin,
          dest,
          realDataSource: "EXPEDIA_API",
          dataType: "LIVE_FLIGHT_DATA"
        }
      };
      
    } catch (error) {
      console.error('❌ Expedia API error:', error);
      return null;
    }
  }
}); 