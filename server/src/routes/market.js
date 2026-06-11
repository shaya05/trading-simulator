import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getHistory, getOptionsChain, getQuote, getTrendingQuotes, searchSymbols } from '../services/yahoo.js';

const router = express.Router();

router.get('/search', asyncHandler(async (request, response) => {
  const query = String(request.query.q || '').trim();
  if (!query) {
    return response.json({ results: [] });
  }

  const results = await searchSymbols(query);
  return response.json({ results });
}));

router.get('/quote/:symbol', asyncHandler(async (request, response) => {
  const quote = await getQuote(request.params.symbol);
  return response.json({ quote });
}));

router.get('/history/:symbol', asyncHandler(async (request, response) => {
  const range = String(request.query.range || '1y');
  const history = await getHistory(request.params.symbol, range);
  return response.json({ history });
}));

router.get('/trending', asyncHandler(async (_request, response) => {
  const quotes = await getTrendingQuotes('US', 10);
  return response.json({ quotes });
}));

router.get('/options/:symbol', asyncHandler(async (request, response) => {
  const options = await getOptionsChain(request.params.symbol);
  return response.json({ options });
}));

export default router;