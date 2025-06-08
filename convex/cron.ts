import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Frequent scraping - every 10 minutes
crons.interval(
  "frequent scraper",
  { minutes: 10 }, // Every 10 minutes
  api.scrapers.runDailyScraper
);

// Hourly Holt-Winters analytics update
crons.cron(
  "holt-winters update",
  "0 * * * *", // Every hour at minute 0
  api.analytics.updateAllBaselines
);

// Daily package building - 5:30 AM ET
crons.interval(
  "build packages",
  { hours: 24 }, // Every 24 hours
  api.analytics.buildPackages
);

// Expire unpaid orders - every 30 minutes
crons.interval(
  "expire unpaid orders",
  { minutes: 30 },
  api.orders.expireUnpaidOrders
);

export default crons; 