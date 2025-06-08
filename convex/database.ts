import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveFlight = mutation({
  args: {
    scrapedAt: v.number(),
    origin: v.union(v.literal("JFK"), v.literal("LGA"), v.literal("EWR")),
    dest: v.union(v.literal("MCO"), v.literal("FLL"), v.literal("MIA"), v.literal("TPA")),
    date: v.string(),
    lowestUsd: v.number(),
    airline: v.string(),
    url: v.string(),
    expectedUsd: v.optional(v.number()),
    deltaPct: v.optional(v.number()),
    zScore: v.optional(v.number()),
    rarity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if a similar flight record already exists
    const existing = await ctx.db
      .query("flight_fares")
      .withIndex("by_origin_dest_date", (q) =>
        q.eq("origin", args.origin).eq("dest", args.dest).eq("date", args.date)
      )
      .first();

    if (existing) {
      // If the new price is lower or the same, update it, otherwise keep the existing one
      if (args.lowestUsd <= existing.lowestUsd) {
        return await ctx.db.patch(existing._id, args);
      } else {
        // If the new price is higher, just update analytics fields if present
        const { lowestUsd, airline, url, ...analyticsData } = args;
        if (Object.keys(analyticsData).length > 0) {
          return await ctx.db.patch(existing._id, analyticsData);
        }
        return existing._id; // Do nothing if price is higher and no new analytics
      }
    } else {
      return await ctx.db.insert("flight_fares", args);
    }
  },
});

export const saveHotel = mutation({
  args: {
    scrapedAt: v.number(),
    region: v.union(v.literal("ORL"), v.literal("MIA"), v.literal("TPA"), v.literal("FLL")),
    checkIn: v.string(),
    checkOut: v.string(),
    nightlyUsd: v.number(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("hotel_rates", args);
  },
});

export const logScrape = mutation({
  args: {
    timestamp: v.number(),
    scrapeType: v.union(v.literal("flights"), v.literal("hotels")),
    target: v.string(),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("captcha")),
    errorMessage: v.optional(v.string()),
    duration: v.optional(v.number()),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scrape_logs", args);
  },
});

export const createPackage = mutation({
  args: {
    createdAt: v.number(),
    origin: v.union(v.literal("JFK"), v.literal("LGA"), v.literal("EWR")),
    dest: v.union(v.literal("MCO"), v.literal("FLL"), v.literal("MIA"), v.literal("TPA")),
    region: v.union(v.literal("ORL"), v.literal("MIA"), v.literal("TPA"), v.literal("FLL")),
    departDate: v.string(),
    returnDate: v.string(),
    stayNights: v.number(),
    flightUsd: v.number(),
    hotelUsd: v.number(),
    totalUsd: v.number(),
    pctSaved: v.number(),
    rarityScore: v.number(),
    pDrop: v.number(),
    flightUrl: v.string(),
    hotelUrl: v.string(),
    isHotDeal: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("packages", args);
  },
});

export const deletePackage = mutation({
  args: {
    id: v.id("packages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const createOrder = mutation({
  args: {
    packageId: v.id("packages"),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    totalUsd: v.number(),
    stripeSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orders", {
      createdAt: Date.now(),
      status: "pending_payment",
      ...args,
    });
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("in_progress"),
      v.literal("booked"),
      v.literal("refund_pending"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    refundReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, ...updateData } = args;
    return await ctx.db.patch(orderId, updateData);
  },
});

export const createBooking = mutation({
  args: {
    orderId: v.id("orders"),
    flightConfirmation: v.optional(v.string()),
    hotelConfirmation: v.optional(v.string()),
    actualFlightUsd: v.optional(v.number()),
    actualHotelUsd: v.optional(v.number()),
    bookedByStaff: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bookings", {
      createdAt: Date.now(),
      ...args,
    });
  },
});

export const updateBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    flightConfirmation: v.optional(v.string()),
    hotelConfirmation: v.optional(v.string()),
    flightBookedAt: v.optional(v.number()),
    hotelBookedAt: v.optional(v.number()),
    actualFlightUsd: v.optional(v.number()),
    actualHotelUsd: v.optional(v.number()),
    bookedByStaff: v.optional(v.string()),
    itinerarySentAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { bookingId, ...updateData } = args;
    return await ctx.db.patch(bookingId, updateData);
  },
});

// Queries
export const getFlightFares = query({
  args: {
    origin: v.optional(v.union(v.literal("JFK"), v.literal("LGA"), v.literal("EWR"))),
    dest: v.optional(v.union(v.literal("MCO"), v.literal("FLL"), v.literal("MIA"), v.literal("TPA"))),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("flight_fares");
    
    if (args.origin) {
      query = query.filter((q) => q.eq(q.field("origin"), args.origin));
    }
    if (args.dest) {
      query = query.filter((q) => q.eq(q.field("dest"), args.dest));
    }
    if (args.date) {
      query = query.filter((q) => q.eq(q.field("date"), args.date));
    }
    
    return await query.order("desc").take(100);
  },
});

export const getHotelRates = query({
  args: {
    region: v.optional(v.union(v.literal("ORL"), v.literal("MIA"), v.literal("TPA"), v.literal("FLL"))),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("hotel_rates");
    
    if (args.region) {
      query = query.filter((q) => q.eq(q.field("region"), args.region));
    }
    if (args.checkIn) {
      query = query.filter((q) => q.eq(q.field("checkIn"), args.checkIn));
    }
    if (args.checkOut) {
      query = query.filter((q) => q.eq(q.field("checkOut"), args.checkOut));
    }
    
    return await query.order("desc").take(100);
  },
});

export const getPackages = query({
  args: {
    origin: v.optional(v.union(v.literal("JFK"), v.literal("LGA"), v.literal("EWR"))),
    dest: v.optional(v.union(v.literal("MCO"), v.literal("FLL"), v.literal("MIA"), v.literal("TPA"))),
    hotDealsOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("packages");
    
    if (args.origin) {
      query = query.filter((q) => q.eq(q.field("origin"), args.origin));
    }
    if (args.dest) {
      query = query.filter((q) => q.eq(q.field("dest"), args.dest));
    }
    if (args.hotDealsOnly) {
      query = query.filter((q) => q.eq(q.field("isHotDeal"), true));
    }
    
    return await query.order("asc").take(50);
  },
});

export const getOrders = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("in_progress"),
      v.literal("booked"),
      v.literal("refund_pending"),
      v.literal("refunded"),
      v.literal("cancelled")
    )),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("orders");
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    if (args.customerEmail) {
      query = query.filter((q) => q.eq(q.field("customerEmail"), args.customerEmail));
    }
    
    return await query.order("desc").take(100);
  },
});

export const getScrapeStatus = query({
  args: {},
  handler: async (ctx) => {
    const recent = await ctx.db
      .query("scrape_logs")
      .order("desc")
      .take(20);
    
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    
    const recentStats = recent.filter(log => log.timestamp > last24Hours);
    const successCount = recentStats.filter(log => log.status === 'success').length;
    const errorCount = recentStats.filter(log => log.status === 'error').length;
    const captchaCount = recentStats.filter(log => log.status === 'captcha').length;
    
    return {
      recent,
      stats: {
        successCount,
        errorCount,
        captchaCount,
        successRate: successCount / (successCount + errorCount + captchaCount) || 0,
      },
    };
  },
});

export const storeScrapeResult = mutation({
  args: {
    type: v.string(),
    route: v.string(),
    date: v.string(),
    price: v.number(),
    source: v.string(),
    url: v.string(),
    
    // Enhanced flight data fields
    airline: v.optional(v.string()),
    flightNumber: v.optional(v.string()),
    aircraftType: v.optional(v.string()),
    departureTime: v.optional(v.string()),
    arrivalTime: v.optional(v.string()),
    duration: v.optional(v.string()),
    stops: v.optional(v.number()),
    stopCities: v.optional(v.array(v.string())),
    layoverDuration: v.optional(v.string()),
    fareType: v.optional(v.string()),
    seatsRemaining: v.optional(v.number()),
    baggageIncluded: v.optional(v.string()),
    refundable: v.optional(v.boolean()),
    changeFee: v.optional(v.number()),
    bookingClass: v.optional(v.string()),
    lastSaleDate: v.optional(v.string()),
    
    // Enhanced hotel data fields
    hotelName: v.optional(v.string()),
    starRating: v.optional(v.number()),
    hotelType: v.optional(v.string()),
    brand: v.optional(v.string()),
    distanceFromAirport: v.optional(v.string()),
    distanceFromCenter: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())),
    neighborhood: v.optional(v.string()),
    roomType: v.optional(v.string()),
    maxOccupancy: v.optional(v.number()),
    roomSize: v.optional(v.string()),
    bedType: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
    paymentOptions: v.optional(v.string()),
    mealsIncluded: v.optional(v.string()),
    taxesIncluded: v.optional(v.boolean()),
    guestRating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    recentHighlights: v.optional(v.array(v.string())),
    lastBookedTime: v.optional(v.string()),
    roomsRemaining: v.optional(v.number()),
    popularProperty: v.optional(v.boolean()),
    
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scrapeResults", {
      ...args,
      scrapedAt: Date.now(),
    });
  },
});

export const getScrapeResults = query({
  args: { 
    type: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("scrapeResults");
    
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }
    
    return await query
      .order("desc")
      .take(args.limit || 50);
  },
});

export const getLatestPrices = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db.query("scrapeResults")
      .filter((q) => q.gt(q.field("price"), 0))
      .order("desc")
      .take(10);
    
    return results;
  },
});

/**
 * Update an existing scrape result with Holt-Winters analytics
 */
export const updateScrapeResult = mutation({
  args: {
    id: v.id("scrapeResults"),
    updates: v.object({
      expectedUsd: v.optional(v.number()),
      deltaPct: v.optional(v.number()),
      zScore: v.optional(v.number()),
      rarity: v.optional(v.number()),
      isAnomaly: v.optional(v.boolean()),
      hwModelUpdated: v.optional(v.number())
    })
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, args.updates);
  }
});

/**
 * Delete a scrape result - Used for cleaning mock data
 */
export const deleteScrapeResult = mutation({
  args: {
    id: v.id("scrapeResults"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
}); 