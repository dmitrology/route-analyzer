# "Holt-Winters" ≠ "Hotel Winters"

* **Holt-Winters** (a.k.a. *triple exponential smoothing*) is a classic time-series-forecasting method created by Charles Holt and Peter Winters in the 1950s.
* It models three separate components of a series:

| Component       | Notation      | What it captures                                               |
| --------------- | ------------- | -------------------------------------------------------------- |
| **Level**       | ℓ<sub>t</sub> | The "typical" price around time *t*                            |
| **Trend**       | b<sub>t</sub> | Long-term slope (prices drifting up/down)                      |
| **Seasonality** | s<sub>t</sub> | Repeating calendar pattern (e.g. summer spikes, weekend bumps) |

At each new observation it updates these equations (simplified):

```
ℓt = α·yt + (1–α)·(ℓt–1 + bt–1)
bt = β·(ℓt – ℓt–1) + (1–β)·bt–1
st = γ·(yt / ℓt) + (1–γ)·st–m
ŷt+h = (ℓt + h·bt) · st+h–m           ← forecast h steps ahead
```

α, β, γ ∈ (0,1) are smoothing parameters learned by minimising past forecast error.
This single model gives us both **a short-term forecast** and **an "expected" value** for each day. ([otexts.com][1])

---

## Why do we need it in RouteDeals?

1. **Scraping → time-series**

   * Each daily Playwright scrape yields **the lowest fare for a specific route and date**
     → one row/day/route in `scrapeResults`.
2. **Baseline forecasting**

   * Holt-Winters runs every night (`updateAllBaselines()` cron at 2:00 AM) to predict the "normal" lowest fare 1, 2, … 90 days out.
3. **Deal detection**

   * The difference between *today's* scraped fare and the **expected fare** from Holt-Winters is our primary *savings signal*

     ```ts
     deltaPct = (expectedUsd - lowestUsd) / expectedUsd
     ```
   * We also compute a **z-score** (how many IQRs today is below the 30-day median) and a **rarity quantile** (fraction of the past year that was cheaper). Holt-Winters gives us cleaner residuals than naïve rolling averages, so these anomaly metrics are more reliable ([blogs.vmware.com][2]).
4. **Package builder**

   * When we join flights + hotels, the rarity/savings fields from each component feed the bundle's `rarityScore` and "🔥 Book Now" badge.
5. **Probability-to-drop badge**

   * A simple logistic model uses `deltaPct`, `daysOut`, and the forecast error from Holt-Winters (volatility) to say "price likely to drop further" vs. "book now."

---

## How it plugs into our Convex code

### Core Implementation Files

1. **`convex/lib/holtWinters.ts`** - Core algorithm implementation
   - `holtWintersFit()` - Fits model to historical data with parameter optimization
   - `holtWintersForecast()` - Generates forecasts h steps ahead
   - `calculateAnomalyScore()` - Computes z-score and anomaly flags
   - `calculateRarityScore()` - Determines rarity percentile

2. **`convex/analytics.ts`** - Analytics pipeline
   - `updateFlightBaselines()` - Processes all flight routes
   - `updateHotelBaselines()` - Processes all hotel regions
   - `getTopDeals()` - Returns anomaly-detected deals
   - `calculateProbabilityToDrop()` - Logistic model for booking recommendations

3. **`convex/cron.ts`** - Automated scheduling
   - Daily Holt-Winters update at 2:00 AM
   - Ensures fresh baselines for deal detection

### Database Schema Enhancement

The `scrapeResults` table now includes Holt-Winters fields:

```typescript
{
  // Original fields
  price: number;
  route: string;
  date: string;
  
  // Holt-Winters analytics  
  expectedUsd?: number;     // Model prediction
  deltaPct?: number;        // (expected - actual) / expected
  zScore?: number;          // Anomaly score  
  rarity?: number;          // Percentile (0-1, lower = rarer)
  isAnomaly?: boolean;      // |zScore| > 2
  hwModelUpdated?: number;  // Timestamp of last update
}
```

### Example Usage

```ts
// Manual trigger from admin UI
const updateBaselines = useMutation(api.analytics.updateAllBaselines);
await updateBaselines({});

// Get top anomaly deals
const topDeals = useQuery(api.analytics.getTopDeals, { 
  limit: 10, 
  minSavings: 0.15,  // 15%+ savings
  maxRarity: 0.25    // Top 25% rarest
});

// Check drop probability for specific deal
const dropAnalysis = useQuery(api.analytics.calculateProbabilityToDrop, {
  recordId: dealId
});
// Returns: { probability: 0.23, confidence: "high", recommendation: "book" }
```

---

## Key Features Implemented

### 1. **Automated Parameter Optimization**
- Grid search across α, β, γ parameter space
- Minimizes Mean Squared Error (MSE)
- Handles insufficient data gracefully

### 2. **Weekly Seasonality Detection**  
- 7-day seasonal period captures weekend flight price spikes
- Handles irregular patterns like holiday surges
- Additive seasonality model suitable for price data

### 3. **Robust Anomaly Detection**
- Uses Median Absolute Deviation (MAD) for outlier-resistant variance
- Z-score threshold of ±2 for anomaly flagging
- Combines multiple signals: savings %, rarity, z-score

### 4. **Smart Deal Scoring**
- Composite score: `0.7 × deltaPct + 0.3 × (1 - rarity)`
- Prioritizes both absolute savings and historical rarity
- Filters out low-quality deals automatically

### 5. **Probability-to-Drop Logic**
- Logistic regression using:
  - Current savings percentage
  - Days until travel
  - Historical rarity
  - Anomaly magnitude
- Generates actionable recommendations: "book" vs "wait"

---

## UI Integration

The enhanced dashboard now displays:

### Analytics Overview Cards
- **Model Performance**: Forecast accuracy percentage
- **Active Deals**: Count of current anomalies  
- **Last Analysis**: Timestamp of latest baseline update
- **Rarity Engine**: Status indicator

### Enhanced Deal Cards
- **Savings Display**: Expected vs actual price with percentage
- **Rarity Metrics**: Percentile ranking and z-score
- **Anomaly Badges**: Visual indicators for rare/anomalous deals
- **Enhanced Details**: Flight schedules, hotel amenities with analytics overlay

### Admin Controls
- Manual Holt-Winters trigger button
- Real-time model performance monitoring
- Comprehensive scraping status

---

## Performance & Scalability

### Computational Efficiency
- **O(N)** time complexity for model fitting
- **Memory-light**: Stores only latest seasonal cycle, not full history
- **TypeScript-only**: No external Python dependencies

### Database Optimization
- Indexed on `deltaPct`, `rarity`, `zScore` for fast deal queries
- Batch updates minimize database round-trips
- Incremental processing of new routes

### Error Handling
- Graceful degradation when insufficient data (< 14 observations)
- Fallback parameters if optimization fails
- Continues processing other routes on individual failures

---

## Model Validation

### Accuracy Metrics
- **MAPE** (Mean Absolute Percentage Error) tracking
- **MSE** minimization during parameter search
- **Residual analysis** for model diagnostics

### Business Logic Validation  
- Anomaly detection rate monitoring
- Deal conversion tracking (when implemented)
- False positive/negative analysis

---

## Future Enhancements

### Short-term (Next Sprint)
1. **Route-specific Seasonality**: Different seasonal periods for different routes
2. **Dynamic Thresholds**: Adaptive anomaly detection based on route volatility  
3. **Booking Conversion Tracking**: Validate probability-to-drop accuracy

### Medium-term
1. **External Factors**: Incorporate weather, events, competitor pricing
2. **Multi-step Forecasting**: Predict price evolution over booking window
3. **Ensemble Methods**: Combine Holt-Winters with other algorithms

### Long-term
1. **Real-time Updates**: Streaming analytics as new data arrives
2. **Personalization**: User-specific deal scoring
3. **Market Intelligence**: Cross-route price correlation analysis

---

## Technical Architecture Benefits

### 1. **Serverless-Native**
- Runs entirely within Convex action/mutation framework
- No external ML infrastructure required
- Automatic scaling with traffic

### 2. **Real-time Capability**  
- Sub-second deal detection after scraping
- Live model performance monitoring
- Instant UI updates via Convex reactivity

### 3. **Maintainable Codebase**
- Pure TypeScript implementation
- Clear separation of concerns (algorithm vs application logic)
- Comprehensive TypeScript types for safety

---

## Conclusion

The Holt-Winters implementation transforms RouteDeals from a simple price aggregator into an **intelligent deal detection engine**. By providing:

- **Contextual baselines** through time-series forecasting
- **Statistically-grounded anomaly detection**  
- **Actionable booking recommendations**
- **Professional-grade analytics UI**

We now have the "secret sauce" that lets us confidently label a particular fare as *rarely this low* and help users make optimal booking decisions.

The system is production-ready, scales with our data growth, and provides the analytical foundation for expanding beyond NYC↔Florida to other travel markets.

---

### References

* [Forecasting textbook chapter: Holt-Winters seasonal method][1]
* [VMware deep-dive on Holt-Winters anomaly detection][2]  
* [Medium article on Holt-Winters mechanics][3]
* [Academic paper on time-series anomaly detection][4]

[1]: https://otexts.com/fpp2/holt-winters.html "7.3 Holt-Winters' seasonal method | Forecasting - OTexts"
[2]: https://blogs.vmware.com/load-balancing/2024/03/20/holt-winters-algorithm-anomaly-detection-vmware-avi-load-balancer/ "Holt-Winters Algorithm & Anomaly Detection | VMware Avi Load Balancer"
[3]: https://medium.com/analytics-vidhya/a-thorough-introduction-to-holt-winters-forecasting-c21810b8c0e6 "A Thorough Introduction to Holt-Winters Forecasting - Medium"
[4]: https://www.diva-portal.org/smash/get/diva2%3A1198551/FULLTEXT02.pdf "Anomaly Detection in Time Series Data Based on Holt-Winters Method" 