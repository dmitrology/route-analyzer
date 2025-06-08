import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateDealDescription = action({
  args: {
    origin: v.string(),
    dest: v.string(),
    departDate: v.string(),
    returnDate: v.string(),
    stayNights: v.number(),
    totalUsd: v.number(),
    pctSaved: v.number(),
    rarityScore: v.number(),
    isHotDeal: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      return null; // OpenAI not configured
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a travel deal copywriter for RouteDeals. Write compelling, concise deal descriptions that highlight value and urgency. Focus on the destination's appeal and savings. Keep it under 100 words and professional but exciting.`
            },
            {
              role: 'user',
              content: `Write a deal description for:
- Route: ${args.origin} to ${getDestinationName(args.dest)}
- Dates: ${args.departDate} to ${args.returnDate} (${args.stayNights} nights)
- Total cost: $${args.totalUsd}
- Savings: ${Math.round(args.pctSaved * 100)}%
- Rarity: ${getRarityDescription(args.rarityScore)}
- Hot deal: ${args.isHotDeal ? 'Yes' : 'No'}`
            }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('Error generating deal description:', error);
      return null;
    }
  },
});

export const generatePriceInsight = action({
  args: {
    currentPrice: v.number(),
    expectedPrice: v.number(),
    historicalPrices: v.array(v.number()),
    pDrop: v.number(),
  },
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      return getBasicInsight(args);
    }

    try {
      const priceAnalysis = analyzePriceData(args);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a travel pricing analyst. Provide brief, actionable insights about flight/hotel prices. Be data-driven but accessible. Mention specific dollar amounts and percentages.`
            },
            {
              role: 'user',
              content: `Analyze this pricing data:
- Current price: $${args.currentPrice}
- Expected/normal price: $${args.expectedPrice}
- Price difference: $${Math.abs(args.currentPrice - args.expectedPrice)} ${args.currentPrice < args.expectedPrice ? 'below' : 'above'} normal
- Drop probability: ${Math.round(args.pDrop * 100)}%
- Historical context: ${priceAnalysis}

Give a 1-2 sentence insight about whether to book now or wait.`
            }
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || getBasicInsight(args);
    } catch (error) {
      console.error('Error generating price insight:', error);
      return getBasicInsight(args);
    }
  },
});

export const generateMarketSummary = action({
  args: {
    totalPackages: v.number(),
    hotDealsCount: v.number(),
    avgSavings: v.number(),
    topRoutes: v.array(v.object({
      route: v.string(),
      avgPrice: v.number(),
      trend: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      return getBasicMarketSummary(args);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a travel market analyst. Summarize NYC-Florida travel market conditions in 2-3 sentences. Be concise and actionable.`
            },
            {
              role: 'user',
              content: `Market data:
- Total packages available: ${args.totalPackages}
- Hot deals (rare bargains): ${args.hotDealsCount}
- Average savings: ${Math.round(args.avgSavings * 100)}%
- Top routes: ${args.topRoutes.map(r => `${r.route} ($${r.avgPrice}, ${r.trend})`).join(', ')}

Summarize the market conditions and booking recommendations.`
            }
          ],
          max_tokens: 120,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || getBasicMarketSummary(args);
    } catch (error) {
      console.error('Error generating market summary:', error);
      return getBasicMarketSummary(args);
    }
  },
});

// Helper functions
function getDestinationName(dest: string): string {
  const destinations = {
    'MCO': 'Orlando',
    'FLL': 'Fort Lauderdale', 
    'MIA': 'Miami',
    'TPA': 'Tampa',
  };
  return destinations[dest as keyof typeof destinations] || dest;
}

function getRarityDescription(rarity: number): string {
  if (rarity <= 0.1) return 'Extremely rare (top 10%)';
  if (rarity <= 0.25) return 'Very rare (top 25%)';
  if (rarity <= 0.5) return 'Rare (top 50%)';
  if (rarity <= 0.75) return 'Uncommon (top 75%)';
  return 'Common';
}

function analyzePriceData(args: { historicalPrices: number[], currentPrice: number, expectedPrice: number }): string {
  const { historicalPrices, currentPrice, expectedPrice } = args;
  
  if (historicalPrices.length === 0) {
    return 'Limited historical data available';
  }
  
  const sortedPrices = [...historicalPrices].sort((a, b) => a - b);
  const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const min = sortedPrices[0];
  const max = sortedPrices[sortedPrices.length - 1];
  
  const percentile = sortedPrices.filter(p => p <= currentPrice).length / sortedPrices.length;
  
  if (percentile <= 0.1) return `Current price is in the lowest 10% seen over the past year (range: $${min}-$${max})`;
  if (percentile <= 0.25) return `Current price is in the lowest 25% seen (median: $${median})`;
  if (percentile >= 0.9) return `Current price is in the highest 10% seen (consider waiting)`;
  
  return `Current price is ${Math.round(percentile * 100)}th percentile (median: $${median})`;
}

function getBasicInsight(args: { currentPrice: number, expectedPrice: number, pDrop: number }): string {
  const priceDiff = args.currentPrice - args.expectedPrice;
  const diffPct = Math.abs(priceDiff) / args.expectedPrice;
  
  if (priceDiff < -20 && diffPct > 0.15) {
    return `Excellent deal! $${Math.abs(priceDiff)} below normal price. Book now - only ${Math.round(args.pDrop * 100)}% chance of going lower.`;
  }
  
  if (args.pDrop > 0.7) {
    return `High chance (${Math.round(args.pDrop * 100)}%) this price will drop. Consider waiting a few days.`;
  }
  
  return `Fair price. ${Math.round(args.pDrop * 100)}% chance of price drop. Book if dates work for you.`;
}

function getBasicMarketSummary(args: { totalPackages: number, hotDealsCount: number, avgSavings: number }): string {
  const hotDealRatio = args.hotDealsCount / args.totalPackages;
  
  if (hotDealRatio > 0.2) {
    return `Strong buyer's market with ${args.hotDealsCount} hot deals available. Average savings of ${Math.round(args.avgSavings * 100)}% make this an excellent time to book NYC-Florida trips.`;
  }
  
  if (hotDealRatio > 0.1) {
    return `Moderate deals available with ${Math.round(args.avgSavings * 100)}% average savings. ${args.hotDealsCount} exceptional bargains worth booking immediately.`;
  }
  
  return `Limited deals in current market. ${args.hotDealsCount} rare bargains available - book quickly as good deals are scarce.`;
} 