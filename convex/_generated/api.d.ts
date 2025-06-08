/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as analytics from "../analytics.js";
import type * as cron from "../cron.js";
import type * as database from "../database.js";
import type * as lib_holtWinters from "../lib/holtWinters.js";
import type * as orders from "../orders.js";
import type * as real_scraper from "../real_scraper.js";
import type * as scrapers from "../scrapers.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  analytics: typeof analytics;
  cron: typeof cron;
  database: typeof database;
  "lib/holtWinters": typeof lib_holtWinters;
  orders: typeof orders;
  real_scraper: typeof real_scraper;
  scrapers: typeof scrapers;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
