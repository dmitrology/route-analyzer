import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

export const expireUnpaidOrders = action({
  args: {},
  handler: async (ctx) => {
    console.log("Checking for expired unpaid orders...");
    
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const pendingOrders = await ctx.runQuery(api.database.getOrders, {
      status: "pending_payment",
    });
    
    const expiredOrders = pendingOrders.filter((order: Doc<"orders">) => 
      order.createdAt < thirtyMinutesAgo
    );
    
    let expiredCount = 0;
    
    for (const order of expiredOrders) {
      // Update order status to cancelled
      await ctx.runMutation(api.database.updateOrderStatus, {
        orderId: order._id,
        status: "cancelled",
        notes: "Automatically cancelled - payment not completed within 30 minutes",
      });
      
      expiredCount++;
      console.log(`Expired order ${order._id} for ${order.customerEmail}`);
    }
    
    console.log(`Expired ${expiredCount} unpaid orders`);
    return { expiredCount };
  },
});

export const handleStripeWebhook = action({
  args: {
    eventType: v.string(),
    sessionId: v.string(), 
    paymentIntentId: v.string(),
    amountReceived: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    console.log(`Processing Stripe webhook: ${args.eventType}`);
    
    if (args.eventType === "checkout.session.completed") {
      // Find the order by Stripe session ID
      const orders = await ctx.runQuery(api.database.getOrders, {});
      const order = orders.find((o: Doc<"orders">) => o.stripeSessionId === args.sessionId);
      
      if (!order) {
        console.error(`Order not found for session ${args.sessionId}`);
        return { success: false, error: "Order not found" };
      }
      
      // Verify the amount matches
      if (Math.abs(order.totalUsd - args.amountReceived / 100) > 0.01) {
        console.error(`Amount mismatch for order ${order._id}: expected ${order.totalUsd}, received ${args.amountReceived / 100}`);
        return { success: false, error: "Amount mismatch" };
      }
      
      // Update order status to paid
      await ctx.runMutation(api.database.updateOrderStatus, {
        orderId: order._id,
        status: "paid",
        stripePaymentIntentId: args.paymentIntentId,
        notes: "Payment completed via Stripe",
      });
      
      // Send confirmation email (would integrate with Resend here)
      console.log(`Order ${order._id} marked as paid - sending confirmation email to ${order.customerEmail}`);
      
      return { success: true, orderId: order._id };
    }
    
    if (args.eventType === "payment_intent.payment_failed") {
      // Handle failed payment
      const orders = await ctx.runQuery(api.database.getOrders, {});
      const order = orders.find((o: Doc<"orders">) => o.stripePaymentIntentId === args.paymentIntentId);
      
      if (order) {
        await ctx.runMutation(api.database.updateOrderStatus, {
          orderId: order._id,
          status: "cancelled",
          notes: "Payment failed",
        });
        
        console.log(`Order ${order._id} cancelled due to payment failure`);
      }
      
      return { success: true };
    }
    
    console.log(`Unhandled webhook event: ${args.eventType}`);
    return { success: true };
  },
});

export const startBookingProcess = action({
  args: {
    orderId: v.string(),
    staffEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Update order status to in_progress
    await ctx.runMutation(api.database.updateOrderStatus, {
      orderId: args.orderId as any,
      status: "in_progress",
      notes: `Booking started by ${args.staffEmail}`,
    });
    
    // Create booking record
    await ctx.runMutation(api.database.createBooking, {
      orderId: args.orderId as any,
      bookedByStaff: args.staffEmail,
      notes: "Booking process initiated",
    });
    
    console.log(`Booking process started for order ${args.orderId} by ${args.staffEmail}`);
    return { success: true };
  },
});

export const completeBooking = action({
  args: {
    orderId: v.string(),
    flightConfirmation: v.string(),
    hotelConfirmation: v.string(), 
    actualFlightUsd: v.number(),
    actualHotelUsd: v.number(),
    staffEmail: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const actualTotal = args.actualFlightUsd + args.actualHotelUsd;
    const orders = await ctx.runQuery(api.database.getOrders, {});
    const order = orders.find((o: Doc<"orders">) => o._id === args.orderId);
    
    if (!order) {
      throw new Error("Order not found");
    }
    
    // Check if actual cost is within $25 of quoted price (our refund threshold)
    const priceDifference = actualTotal - order.totalUsd;
    
    if (priceDifference > 25) {
      // Price increased beyond threshold - initiate refund
      await ctx.runMutation(api.database.updateOrderStatus, {
        orderId: args.orderId as any,
        status: "refund_pending",
        refundReason: `Actual cost $${actualTotal} exceeded quoted price $${order.totalUsd} by $${priceDifference}`,
        notes: `Refund initiated by ${args.staffEmail} due to price increase`,
      });
      
      console.log(`Order ${args.orderId} flagged for refund - price increased by $${priceDifference}`);
      return { success: true, refundRequired: true, priceDifference };
    }
    
    // Complete the booking
    await ctx.runMutation(api.database.updateOrderStatus, {
      orderId: args.orderId as any,
      status: "booked",
      notes: `Booking completed by ${args.staffEmail}`,
    });
    
    // Update booking record
    const bookings = await ctx.runQuery(api.database.getOrders, {});
    // Note: In a real implementation, you'd query bookings table and update the specific booking
    
    console.log(`Booking completed for order ${args.orderId}`);
    
    // Send itinerary email (would integrate with Resend here)
    console.log(`Sending itinerary email to ${order.customerEmail}`);
    
    return { 
      success: true, 
      refundRequired: false,
      confirmations: {
        flight: args.flightConfirmation,
        hotel: args.hotelConfirmation,
      }
    };
  },
}); 