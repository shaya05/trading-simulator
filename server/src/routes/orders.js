import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Order } from '../models/Order.js';
import { placeMarketOrder } from '../services/portfolio.js';

const router = express.Router();

router.get('/', asyncHandler(async (request, response) => {
  const orders = await Order.find({ userId: request.user.sub }).sort({ createdAt: -1 }).lean();
  return response.json({ orders });
}));

router.post('/', asyncHandler(async (request, response) => {
  const { symbol, quantity, side, orderType, assetType = 'stock', limitPrice, stopPrice, metadata = {} } = request.body;

  if (!symbol || !quantity || !side || !orderType) {
    return response.status(400).json({ message: 'symbol, quantity, side, and orderType are required' });
  }

  if (orderType === 'market') {
    const execution = await placeMarketOrder({
      userId: request.user.sub,
      symbol: String(symbol).toUpperCase(),
      assetType,
      side,
      quantity: Number(quantity),
      metadata
    });

    return response.status(201).json({ order: execution, status: 'filled' });
  }

  const order = await Order.create({
    userId: request.user.sub,
    symbol: String(symbol).toUpperCase(),
    assetType,
    side,
    orderType,
    quantity: Number(quantity),
    limitPrice: limitPrice ? Number(limitPrice) : undefined,
    stopPrice: stopPrice ? Number(stopPrice) : undefined,
    metadata
  });

  return response.status(201).json({ order });
}));

router.patch('/:orderId/cancel', asyncHandler(async (request, response) => {
  const order = await Order.findOneAndUpdate(
    { _id: request.params.orderId, userId: request.user.sub, status: 'open' },
    { status: 'cancelled' },
    { new: true }
  );

  if (!order) {
    return response.status(404).json({ message: 'Open order not found' });
  }

  return response.json({ order });
}));

export default router;