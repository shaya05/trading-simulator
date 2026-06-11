import { apiFetch } from '../api/client.js';

export async function fetchTrendingQuotes(token) {
  return apiFetch('/market/trending', { token });
}

export async function fetchStockSnapshot(token, symbol, range = '24h') {
  const [quoteData, historyData] = await Promise.all([
    apiFetch(`/market/quote/${encodeURIComponent(symbol)}`, { token }),
    apiFetch(`/market/history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`, { token }),
  ]);

  return {
    quote: quoteData.quote,
    history: historyData.history || [],
  };
}
