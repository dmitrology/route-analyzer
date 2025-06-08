/**
 * Holt-Winters Triple Exponential Smoothing Implementation
 * 
 * This implements the additive seasonality variant suitable for price forecasting.
 * Components:
 * - Level (ℓt): The "typical" price around time t
 * - Trend (bt): Long-term slope (prices drifting up/down)
 * - Seasonality (st): Repeating calendar pattern (e.g. weekend bumps)
 */

export interface HoltWintersParams {
  alpha: number;   // Level smoothing parameter (0,1)
  beta: number;    // Trend smoothing parameter (0,1)
  gamma: number;   // Seasonal smoothing parameter (0,1)
  l: number[];     // Level values
  b: number[];     // Trend values
  s: number[];     // Seasonal values
  m: number;       // Seasonal period (e.g., 7 for weekly)
}

export interface HoltWintersResult {
  alpha: number;
  beta: number;
  gamma: number;
  l: number[];
  b: number[];
  s: number[];
  m: number;
  fitted: number[];
  residuals: number[];
  mae: number;     // Mean Absolute Error
  mse: number;     // Mean Squared Error
}

/**
 * Fits a Holt-Winters model to time series data
 * @param y - Time series values (must have at least 2*m observations)
 * @param m - Seasonal period (default: 7 for weekly)
 * @param alpha - Level smoothing (if null, will be optimized)
 * @param beta - Trend smoothing (if null, will be optimized)
 * @param gamma - Seasonal smoothing (if null, will be optimized)
 */
export function holtWintersFit(
  y: number[],
  m: number = 7,
  alpha: number | null = null,
  beta: number | null = null,
  gamma: number | null = null
): HoltWintersResult {
  if (y.length < 2 * m) {
    throw new Error(`Need at least ${2 * m} observations for seasonal period ${m}`);
  }

  // If parameters not provided, use reasonable defaults and optimize later
  let bestAlpha = alpha ?? 0.3;
  let bestBeta = beta ?? 0.1;
  let bestGamma = gamma ?? 0.1;
  let bestMSE = Infinity;
  let bestResult: HoltWintersResult | null = null;

  // Simple grid search if parameters not specified
  const searchParams = alpha === null || beta === null || gamma === null;
  const alphaRange = alpha !== null ? [alpha] : [0.1, 0.3, 0.5, 0.7];
  const betaRange = beta !== null ? [beta] : [0.05, 0.1, 0.2];
  const gammaRange = gamma !== null ? [gamma] : [0.05, 0.1, 0.2];

  for (const a of alphaRange) {
    for (const b of betaRange) {
      for (const g of gammaRange) {
        try {
          const result = fitWithParams(y, m, a, b, g);
          if (result.mse < bestMSE) {
            bestMSE = result.mse;
            bestAlpha = a;
            bestBeta = b;
            bestGamma = g;
            bestResult = result;
          }
        } catch (e) {
          // Skip invalid parameter combinations
          continue;
        }
      }
    }
  }

  if (!bestResult) {
    // Fallback to default parameters
    bestResult = fitWithParams(y, m, 0.3, 0.1, 0.1);
  }

  return bestResult;
}

function fitWithParams(y: number[], m: number, alpha: number, beta: number, gamma: number): HoltWintersResult {
  const n = y.length;
  const l: number[] = new Array(n);
  const b: number[] = new Array(n);
  const s: number[] = new Array(n);
  const fitted: number[] = new Array(n);
  const residuals: number[] = new Array(n);

  // Initialize seasonal components using first year of data
  const seasonalInit: number[] = new Array(m);
  for (let i = 0; i < m; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i; j < n; j += m) {
      sum += y[j];
      count++;
    }
    seasonalInit[i] = count > 0 ? sum / count : 0;
  }

  // Deseasonalize for initial level and trend
  const deseasonalized: number[] = new Array(m);
  for (let i = 0; i < m; i++) {
    const avgSeasonal = seasonalInit.reduce((sum, val) => sum + val, 0) / m;
    deseasonalized[i] = y[i] - (seasonalInit[i] - avgSeasonal);
  }

  // Initial level (average of first season)
  l[0] = deseasonalized.reduce((sum, val) => sum + val, 0) / m;

  // Initial trend (simple linear regression on first 2 seasons if available)
  if (n >= 2 * m) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const limit = Math.min(2 * m, n);
    for (let i = 0; i < limit; i++) {
      const x = i + 1;
      const yVal = y[i] - seasonalInit[i % m];
      sumX += x;
      sumY += yVal;
      sumXY += x * yVal;
      sumX2 += x * x;
    }
    const denominator = limit * sumX2 - sumX * sumX;
    b[0] = denominator !== 0 ? (limit * sumXY - sumX * sumY) / denominator : 0;
  } else {
    b[0] = 0;
  }

  // Initial seasonal components (centered)
  for (let i = 0; i < m; i++) {
    const avgSeasonal = seasonalInit.reduce((sum, val) => sum + val, 0) / m;
    s[i] = seasonalInit[i] - avgSeasonal;
  }

  // Forward pass: apply Holt-Winters equations
  for (let t = 0; t < n; t++) {
    const seasonalIndex = t % m;
    
    if (t === 0) {
      fitted[t] = l[t] + s[seasonalIndex];
    } else {
      // Forecast for time t
      fitted[t] = l[t - 1] + b[t - 1] + s[seasonalIndex];
      
      // Update components based on actual observation
      const prevLevel = l[t - 1];
      const prevTrend = b[t - 1];
      
      // Level update: ℓt = α(yt - st-m) + (1-α)(ℓt-1 + bt-1)
      l[t] = alpha * (y[t] - s[seasonalIndex]) + (1 - alpha) * (prevLevel + prevTrend);
      
      // Trend update: bt = β(ℓt - ℓt-1) + (1-β)bt-1
      b[t] = beta * (l[t] - prevLevel) + (1 - beta) * prevTrend;
      
      // Seasonal update: st = γ(yt - ℓt) + (1-γ)st-m
      const newSeasonal = gamma * (y[t] - l[t]) + (1 - gamma) * s[seasonalIndex];
      s[t < m ? (t + m) : seasonalIndex] = newSeasonal;
    }
    
    residuals[t] = y[t] - fitted[t];
  }

  // Calculate error metrics
  const mae = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
  const mse = residuals.reduce((sum, r) => sum + r * r, 0) / n;

  return {
    alpha,
    beta,
    gamma,
    l,
    b,
    s: s.slice(-m), // Keep only the last seasonal cycle
    m,
    fitted,
    residuals,
    mae,
    mse
  };
}

/**
 * Generate forecasts h steps ahead using fitted Holt-Winters model
 * @param params - Fitted model parameters
 * @param h - Forecast horizon (steps ahead)
 * @param t - Current time index (defaults to end of series)
 */
export function holtWintersForecast(
  params: HoltWintersParams,
  h: number,
  t?: number
): number {
  const timeIndex = t ?? (params.l.length - 1);
  const level = params.l[timeIndex];
  const trend = params.b[timeIndex];
  
  // For additive seasonality: ŷt+h = (ℓt + h·bt) + st+h-m
  const seasonalIndex = (timeIndex + h) % params.m;
  const seasonal = params.s[seasonalIndex];
  
  return level + h * trend + seasonal;
}

/**
 * Calculate anomaly score (z-score) for a new observation
 * @param actual - Actual observed value
 * @param expected - Expected value from model
 * @param residuals - Historical residuals for variance estimation
 */
export function calculateAnomalyScore(
  actual: number,
  expected: number,
  residuals: number[]
): { zScore: number; deltaPct: number; isAnomaly: boolean } {
  const deltaPct = expected !== 0 ? (expected - actual) / expected : 0;
  
  // Calculate robust standard deviation using median absolute deviation
  const sortedResiduals = [...residuals].sort((a, b) => a - b);
  const median = sortedResiduals[Math.floor(sortedResiduals.length / 2)];
  const mad = sortedResiduals.map(r => Math.abs(r - median));
  mad.sort((a, b) => a - b);
  const medianMAD = mad[Math.floor(mad.length / 2)];
  const robustStd = medianMAD * 1.4826; // Convert MAD to std estimate
  
  const zScore = robustStd > 0 ? (actual - expected) / robustStd : 0;
  const isAnomaly = Math.abs(zScore) > 2; // More than 2 standard deviations
  
  return { zScore, deltaPct, isAnomaly };
}

/**
 * Calculate rarity quantile: what fraction of historical data was cheaper
 * @param currentPrice - Current price to evaluate
 * @param historicalPrices - Historical price series
 */
export function calculateRarityScore(
  currentPrice: number,
  historicalPrices: number[]
): number {
  if (historicalPrices.length === 0) return 0.5;
  
  const cheaperCount = historicalPrices.filter(price => price <= currentPrice).length;
  return cheaperCount / historicalPrices.length;
} 