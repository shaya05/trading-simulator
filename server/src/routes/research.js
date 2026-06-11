import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getHistory, getOptionsChain, getQuote, getQuoteSummary, resolveSymbolQuery } from '../services/yahoo.js';
import { analyzeWithGemini } from '../services/gemini.js';

const router = express.Router();

router.get('/:symbol', asyncHandler(async (request, response) => {
  const symbolQuery = String(request.params.symbol).trim();
  const symbol = (await resolveSymbolQuery(symbolQuery)) || symbolQuery.toUpperCase();
  const range = String(request.query.range || '1y');
  const [quote, history, quoteSummary, options] = await Promise.all([
    getQuote(symbol),
    getHistory(symbol, range),
    getQuoteSummary(symbol),
    getOptionsChain(symbol)
  ]);

  const analysis = await analyzeWithGemini({
    symbol,
    quote,
    summary: quoteSummary,
    history,
    options
  });

  return response.json({
    symbol,
    quote,
    history,
    quoteSummary,
    options,
    analysis
  });
}));

export default router;