import yahooFinance from '../config/yahoo.js';

const quoteFields = [
  'symbol',
  'shortName',
  'longName',
  'regularMarketPrice',
  'regularMarketChange',
  'regularMarketChangePercent',
  'marketState',
  'currency',
  'fullExchangeName',
  'exchange',
  'regularMarketPreviousClose',
  'regularMarketOpen',
  'regularMarketDayHigh',
  'regularMarketDayLow',
  'regularMarketVolume',
  'marketCap',
  'regularMarketTime',
];

function getMarketSessionDetails(marketState) {
  switch ((marketState || '').toUpperCase()) {
    case 'PREPRE':
      return {
        label: 'Before pre-market',
        description: 'The market is closed. This is the very early period before pre-market trading begins.',
      };
    case 'PRE':
      return {
        label: 'Pre-market',
        description: 'Trading is happening before the regular session opens.',
      };
    case 'REGULAR':
      return {
        label: 'Regular session',
        description: 'Normal market hours are open right now.',
      };
    case 'POST':
      return {
        label: 'After-hours',
        description: 'Trading is happening after the regular session closes.',
      };
    case 'POSTPOST':
      return {
        label: 'Late after-hours',
        description: 'Extended after-hours trading is active.',
      };
    default:
      return {
        label: 'Closed / unknown',
        description: 'The market is not in a regular trading session right now.',
      };
  }
}

function normalizeQuote(symbol, quote) {
  const safeQuote = quote || {};
  const marketSession = getMarketSessionDetails(safeQuote.marketState);

  return {
    symbol,
    shortName: safeQuote.shortName || safeQuote.longName || symbol,
    regularMarketPrice: safeQuote.regularMarketPrice ?? null,
    regularMarketChange: safeQuote.regularMarketChange ?? null,
    regularMarketChangePercent: safeQuote.regularMarketChangePercent ?? null,
    marketState: safeQuote.marketState || null,
    marketSessionLabel: marketSession.label,
    marketSessionDescription: marketSession.description,
    currency: safeQuote.currency || 'USD',
    exchangeName: safeQuote.fullExchangeName || safeQuote.exchange || null,
    previousClose: safeQuote.regularMarketPreviousClose ?? null,
    open: safeQuote.regularMarketOpen ?? null,
    dayHigh: safeQuote.regularMarketDayHigh ?? null,
    dayLow: safeQuote.regularMarketDayLow ?? null,
    volume: safeQuote.regularMarketVolume ?? null,
    marketCap: safeQuote.marketCap ?? null,
    timestamp: safeQuote.regularMarketTime ? new Date(safeQuote.regularMarketTime * 1000).toISOString() : null
  };
}

function looksLikeTickerSymbol(value) {
  const trimmed = String(value || '').trim();
  const normalized = trimmed.toUpperCase();
  return trimmed === normalized && /^[A-Z0-9.^=-]{1,6}$/.test(normalized);
}

export async function resolveSymbolQuery(query) {
  const cleanedQuery = String(query || '').trim();

  if (!cleanedQuery) {
    return null;
  }

  if (looksLikeTickerSymbol(cleanedQuery)) {
    return cleanedQuery.toUpperCase();
  }

  const results = await searchSymbols(cleanedQuery);
  return results[0]?.symbol?.toUpperCase() || null;
}

export async function getQuote(symbol) {
  const resolvedSymbol = (await resolveSymbolQuery(symbol)) || String(symbol || '').trim().toUpperCase();
  const quote = await yahooFinance.quote(resolvedSymbol);
  return normalizeQuote(resolvedSymbol, quote);
}

export async function getQuotes(symbols) {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.toUpperCase()).filter(Boolean))];
  if (!uniqueSymbols.length) {
    return [];
  }

  const results = await yahooFinance.quote(uniqueSymbols, {
    fields: quoteFields,
  });

  const quotes = Array.isArray(results) ? results : [results];

  return quotes
    .filter(Boolean)
    .map((quote) => normalizeQuote(quote.symbol || uniqueSymbols[0], quote));
}

function getHistoryQuery(range = '1y') {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (range) {
    case '24h':
      start.setDate(start.getDate() - 1);
      return { period1: start, period2: end, interval: '5m' };
    case '7d':
      start.setDate(start.getDate() - 7);
      return { period1: start, period2: end, interval: '15m' };
    case '5y':
      start.setFullYear(start.getFullYear() - 5);
      return { period1: start, period2: end, interval: '1wk' };
    case '1y':
    default:
      start.setFullYear(start.getFullYear() - 1);
      return { period1: start, period2: end, interval: '1d' };
  }
}

export async function getHistory(symbol, range = '1y') {
  const resolvedSymbol = (await resolveSymbolQuery(symbol)) || String(symbol || '').trim().toUpperCase();
  const chart = await yahooFinance.chart(resolvedSymbol, getHistoryQuery(range));
  const series = Array.isArray(chart?.quotes)
    ? chart.quotes
    : Array.isArray(chart?.chart?.result?.[0]?.timestamp)
      ? chart.chart.result[0].timestamp.map((timestamp, index) => {
          const quote = chart.chart.result[0].indicators?.quote?.[0] || {};

          return {
            timestamp: new Date(timestamp * 1000).toISOString(),
            open: quote.open?.[index] ?? null,
            high: quote.high?.[index] ?? null,
            low: quote.low?.[index] ?? null,
            close: quote.close?.[index] ?? null,
            volume: quote.volume?.[index] ?? null,
          };
        })
      : [];

  return series
    .map((point) => ({
      timestamp: point.timestamp || (point.date ? new Date(point.date).toISOString() : null),
      open: point.open ?? null,
      high: point.high ?? null,
      low: point.low ?? null,
      close: point.close ?? null,
      volume: point.volume ?? null,
    }))
    .filter((point) => point.timestamp)
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
}

export async function getTrendingQuotes(region = 'US', count = 10) {
  const trending = await yahooFinance.trendingSymbols(region, { count });
  const symbols = (trending?.quotes || []).map((item) => item.symbol).filter(Boolean).slice(0, count);

  if (!symbols.length) {
    return [];
  }

  const quotes = await yahooFinance.quote(symbols, {
    fields: quoteFields,
  });

  const quoteMap = new Map((Array.isArray(quotes) ? quotes : [quotes]).filter(Boolean).map((quote) => [quote.symbol, quote]));

  return symbols
    .map((symbol) => quoteMap.get(symbol))
    .filter(Boolean)
    .map((quote) => normalizeQuote(quote.symbol, quote));
}

export async function searchSymbols(query) {
  const response = await yahooFinance.search(query);
  return response?.quotes?.slice(0, 12).map((item) => ({
    symbol: item.symbol,
    shortName: item.shortname || item.shortName || item.longname || item.longName || item.symbol,
    exchange: item.exchange || item.exchDisp || null,
    quoteType: item.quoteType || null
  })) || [];
}

export async function getOptionsChain(symbol) {
  const resolvedSymbol = (await resolveSymbolQuery(symbol)) || String(symbol || '').trim().toUpperCase();
  const chain = await yahooFinance.options(resolvedSymbol);
  const expiration = chain?.options?.[0] || null;

  return {
    expirationDates: chain?.expirationDates || [],
    calls: expiration?.calls || [],
    puts: expiration?.puts || []
  };
}

export async function getQuoteSummary(symbol) {
  const resolvedSymbol = (await resolveSymbolQuery(symbol)) || String(symbol || '').trim().toUpperCase();
  return yahooFinance.quoteSummary(resolvedSymbol, {
    modules: [
      'price',
      'summaryProfile',
      'summaryDetail',
      'defaultKeyStatistics',
      'financialData',
      'recommendationTrend',
      'earningsTrend'
    ]
  });
}

export { getMarketSessionDetails };