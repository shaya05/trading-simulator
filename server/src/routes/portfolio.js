import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildPortfolioSnapshot } from '../services/portfolio.js';
import { Trade } from '../models/Trade.js';
import { Order } from '../models/Order.js';

const router = express.Router();

router.get('/', asyncHandler(async (request, response) => {
  const portfolio = await buildPortfolioSnapshot(request.user.sub);
  return response.json(portfolio);
}));

router.get('/trades', asyncHandler(async (request, response) => {
  const trades = await Trade.find({ userId: request.user.sub }).sort({ createdAt: -1 }).limit(100).lean();
  return response.json({ trades });
}));

router.get('/orders', asyncHandler(async (request, response) => {
  const orders = await Order.find({ userId: request.user.sub }).sort({ createdAt: -1 }).limit(100).lean();
  return response.json({ orders });
}));

export default router;