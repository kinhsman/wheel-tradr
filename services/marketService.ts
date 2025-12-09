
export const MarketService = {
  fetchQuotes: async (tickers: string[], apiKey: string): Promise<Record<string, number>> => {
    const uniqueTickers = Array.from(new Set(tickers));
    const results: Record<string, number> = {};

    // Finnhub free tier allows ~60 calls/minute. 
    // We fetch in parallel since typical portfolios have < 30 positions.
    const promises = uniqueTickers.map(async (ticker) => {
      try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
        if (!response.ok) return;
        const data = await response.json();
        // 'c' is the current price property in Finnhub's response
        if (data && data.c) {
          results[ticker] = data.c;
        }
      } catch (error) {
        console.error(`Failed to fetch price for ${ticker}`, error);
      }
    });

    await Promise.all(promises);
    return results;
  },

  fetchVix: async (): Promise<number | null> => {
    try {
        // Use Yahoo Finance via a CORS proxy since Finnhub VIX is paywalled.
        // Yahoo Finance Chart API endpoint: query1.finance.yahoo.com/v8/finance/chart/^VIX
        const proxyUrl = 'https://corsproxy.io/?';
        const targetUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d';
        
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        
        if (!response.ok) return null;
        
        const data = await response.json();
        // Extract regularMarketPrice from Yahoo's response structure
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (typeof price === 'number') {
            return price;
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch VIX from Yahoo", error);
        return null;
    }
  }
};