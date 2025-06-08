import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flight_fares: defineTable({
    scrapedAt: v.number(),
    origin: v.union(v.literal("JFK"), v.literal("LGA"), v.literal("EWR")),
    dest: v.union(v.literal("MCO"), v.literal("FLL"), v.literal("MIA"), v.literal("TPA")),
    date: v.string(), // YYYY-MM-DD
    lowestUsd: v.number(),
    airline: v.string(),
    expectedUsd: v.optional(v.number()), // Holt-Winters
    deltaPct: v.optional(v.number()), // (expected-lowest)/expected
    zScore: v.optional(v.number()),
    rarity: v.optional(v.number()), // 0..1
    url: v.string(),
  })
    .index("by_origin_dest_date", ["origin", "dest", "date"])
    .index("by_date", ["date"])
    .index("by_scraped_at", ["scrapedAt"]),

  hotel_rates: defineTable({
    scrapedAt: v.number(),
    region: v.union(v.literal("ORL"), v.literal("MIA"), v.literal("TPA"), v.literal("FLL")),
    checkIn: v.string(), // YYYY-MM-DD
    checkOut: v.string(), // YYYY-MM-DD
    nightlyUsd: v.number(),
    medianBucket: v.optional(v.number()),
    rarity: v.optional(v.number()),
    url: v.string(),
  })
    .index("by_region_dates", ["region", "checkIn", "checkOut"])
    .index("by_check_in", ["checkIn"])
    .index("by_scraped_at", ["scrapedAt"]),

  packages: defineTable({
    createdAt: v.number(),
    origin: v.union(v.literal("JFK"), v.literal("LGA"), v.literal("EWR")),
    dest: v.union(v.literal("MCO"), v.literal("FLL"), v.literal("MIA"), v.literal("TPA")),
    region: v.union(v.literal("ORL"), v.literal("MIA"), v.literal("TPA"), v.literal("FLL")),
    departDate: v.string(), // YYYY-MM-DD
    returnDate: v.string(), // YYYY-MM-DD
    stayNights: v.number(),
    flightUsd: v.number(),
    hotelUsd: v.number(),
    totalUsd: v.number(),
    pctSaved: v.number(), // vs normal pricing
    rarityScore: v.number(), // 0..1 (lower = rarer)
    pDrop: v.number(), // probability price will drop (0..1)
    flightUrl: v.string(),
    hotelUrl: v.string(),
    isHotDeal: v.boolean(), // deltaPct >= 0.15 && rarity <= 0.1
  })
    .index("by_origin_dest", ["origin", "dest"])
    .index("by_rarity", ["rarityScore"])
    .index("by_depart_date", ["departDate"])
    .index("by_hot_deals", ["isHotDeal"]),

  orders: defineTable({
    createdAt: v.number(),
    packageId: v.id("packages"),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    totalUsd: v.number(),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("in_progress"),
      v.literal("booked"),
      v.literal("refund_pending"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    refundReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["customerEmail"])
    .index("by_stripe_session", ["stripeSessionId"]),

  bookings: defineTable({
    createdAt: v.number(),
    orderId: v.id("orders"),
    flightConfirmation: v.optional(v.string()),
    hotelConfirmation: v.optional(v.string()),
    flightBookedAt: v.optional(v.number()),
    hotelBookedAt: v.optional(v.number()),
    actualFlightUsd: v.optional(v.number()),
    actualHotelUsd: v.optional(v.number()),
    bookedByStaff: v.optional(v.string()),
    itinerarySentAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_order", ["orderId"])
    .index("by_staff", ["bookedByStaff"]),

  scrape_logs: defineTable({
    timestamp: v.number(),
    scrapeType: v.union(v.literal("flights"), v.literal("hotels")),
    target: v.string(), // e.g. "JFK-MCO-2024-12-15" or "ORL-2024-12-15-2024-12-20"
    status: v.union(v.literal("success"), v.literal("error"), v.literal("captcha")),
    errorMessage: v.optional(v.string()),
    duration: v.optional(v.number()), // milliseconds
    retryCount: v.optional(v.number()),
  })
    .index("by_type_status", ["scrapeType", "status"])
    .index("by_timestamp", ["timestamp"]),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  scrapeResults: defineTable({
    type: v.string(), // "flight" or "hotel"
    route: v.string(), // e.g., "JFK-MCO" or "MCO"
    date: v.string(), // ISO date string
    price: v.number(), // USD price
    source: v.string(), // "Skyscanner", "Booking.com"
    url: v.string(), // source URL
    scrapedAt: v.number(), // timestamp
    
    // ✈️ Enhanced Flight Data
    airline: v.optional(v.string()), // "JetBlue", "American"
    flightNumber: v.optional(v.string()), // "JB2751", "AA1234"
    aircraftType: v.optional(v.string()), // "A320", "B737"
    
    // 🕐 Time & Schedule
    departureTime: v.optional(v.string()), // "14:30"
    arrivalTime: v.optional(v.string()), // "17:45"
    duration: v.optional(v.string()), // "3h 15m"
    
    // 🛣️ Route Details
    stops: v.optional(v.number()), // 0 = direct, 1+ = connecting
    stopCities: v.optional(v.array(v.string())), // ["ATL"] for layovers
    layoverDuration: v.optional(v.string()), // "1h 30m"
    
    // 💺 Booking Details
    fareType: v.optional(v.string()), // "Basic Economy", "Economy"
    seatsRemaining: v.optional(v.number()), // 3 (creates urgency)
    baggageIncluded: v.optional(v.string()), // "Carry-on included"
    refundable: v.optional(v.boolean()), // true/false
    changeFee: v.optional(v.number()), // $200
    
    // 📊 Additional Context
    bookingClass: v.optional(v.string()), // "Y", "B", "H"
    lastSaleDate: v.optional(v.string()), // "Must book by Dec 15"
    
    // 🏩 Enhanced Hotel Data
    hotelName: v.optional(v.string()), // "Marriott Orlando Downtown"
    starRating: v.optional(v.number()), // 4.5
    hotelType: v.optional(v.string()), // "Hotel", "Resort", "Apartment"
    brand: v.optional(v.string()), // "Marriott", "Hilton"
    
    // 📍 Location & Amenities
    distanceFromAirport: v.optional(v.string()), // "15 minutes"
    distanceFromCenter: v.optional(v.string()), // "2 blocks from downtown"
    amenities: v.optional(v.array(v.string())), // ["Pool", "Gym", "WiFi"]
    neighborhood: v.optional(v.string()), // "Downtown", "Beach Front"
    
    // 🛏️ Room Details
    roomType: v.optional(v.string()), // "Standard King", "Ocean Suite"
    maxOccupancy: v.optional(v.number()), // 2, 4, 6 guests
    roomSize: v.optional(v.string()), // "320 sq ft"
    bedType: v.optional(v.string()), // "King", "Queen"
    
    // 💳 Booking Details
    cancellationPolicy: v.optional(v.string()), // "Free cancellation"
    paymentOptions: v.optional(v.string()), // "Pay now", "Pay at property"
    mealsIncluded: v.optional(v.string()), // "Breakfast included"
    taxesIncluded: v.optional(v.boolean()), // true/false
    
    // ⭐ Guest Experience
    guestRating: v.optional(v.number()), // 8.7 (out of 10)
    reviewCount: v.optional(v.number()), // 1,247
    recentHighlights: v.optional(v.array(v.string())), // ["Great location!"]
    lastBookedTime: v.optional(v.string()), // "Booked 3 hours ago"
    
    // 🔥 Availability & Urgency
    roomsRemaining: v.optional(v.number()), // 3 (creates urgency)
    popularProperty: v.optional(v.boolean()), // true (trending badge)
    
    // Holt-Winters Analytics Fields
    expectedUsd: v.optional(v.number()), // Holt-Winters expected price
    deltaPct: v.optional(v.number()), // (expected - actual) / expected
    zScore: v.optional(v.number()), // anomaly score
    rarity: v.optional(v.number()), // 0..1 rarity score
    isAnomaly: v.optional(v.boolean()), // true if significant anomaly
    hwModelUpdated: v.optional(v.number()), // timestamp of last update
    
    // Legacy metadata field for backward compatibility
    metadata: v.optional(v.any()), // additional data
  })
    .index("by_type", ["type"])
    .index("by_route", ["route"])
    .index("by_date", ["date"])
    .index("by_scraped_at", ["scrapedAt"])
    .index("by_departure_time", ["departureTime"])
    .index("by_stops", ["stops"])
    .index("by_price", ["price"])
    .index("by_star_rating", ["starRating"])
    .index("by_guest_rating", ["guestRating"]),
}); 