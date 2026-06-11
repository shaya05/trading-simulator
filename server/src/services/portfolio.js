import { Order } from '../models/Order.js';
import { Position } from '../models/Position.js';
import { Trade } from '../models/Trade.js';
import { User } from '../models/User.js';
import { getQuotes, getQuote } from './yahoo.js';

async function upsertPosition({ userId, symbol, assetType, quantityDelta, tradePrice, metadata }) {
  const existing = await Position.findOne({ userId, symbol, assetType });

  if (!existing) {
    if (quantityDelta <= 0) {
      throw new Error('Cannot sell a position that does not exist');
    }

    return Position.create({
      userId,
      symbol,
      assetType,
      quantity: quantityDelta,
      avgCost: tradePrice,
      lastPrice: tradePrice,
      optionMeta: metadata?.optionMeta || {}
    });
  }

  const nextQuantity = existing.quantity + quantityDelta;

  if (nextQuantity < 0) {
    throw new Error('Insufficient shares/contracts to sell');
  }

  if (nextQuantity === 0) {
    await existing.deleteOne();
    return null;
  }

  const totalCost = existing.avgCost * existing.quantity + tradePrice * Math.max(quantityDelta, 0);
  const weightedAvg = quantityDelta > 0 ? totalCost / nextQuantity : existing.avgCost;

  existing.quantity = nextQuantity;
  existing.avgCost = weightedAvg;
  existing.lastPrice = tradePrice;
  existing.optionMeta = metadata?.optionMeta || existing.optionMeta;

  await existing.save();
  return existing;
}

export async function recordTrade({ userId, symbol, assetType = 'stock', side, quantity, price, metadata = {} }) {
  const signedQuantity = side === 'buy' ? quantity : -quantity;
  const total = Number((quantity * price).toFixed(2));

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (side === 'buy' && user.cashBalance < total) {
    throw new Error('Insufficient cash balance');
  }

  user.cashBalance = Number((user.cashBalance + (side === 'buy' ? -total : total)).toFixed(2));
  await user.save();

  const trade = await Trade.create({
    userId,
    symbol,
    assetType,
    side,
    quantity,
    price,
    total,
    metadata
  });

  await upsertPosition({
    userId,
    symbol,
    assetType,
    quantityDelta: signedQuantity,
    tradePrice: price,
    metadata
  });

  return { trade, user };
}

export async function buildPortfolioSnapshot(userId) {
  const user = await User.findById(userId).lean();
  const positions = await Position.find({ userId }).sort({ updatedAt: -1 }).lean();
  const symbols = positions.filter((position) => position.assetType === 'stock').map((position) => position.symbol);
  const latestQuotes = await getQuotes(symbols);
  const quoteMap = new Map(latestQuotes.map((quote) => [quote.symbol, quote]));

  const hydratedPositions = positions.map((position) => {
    const liveQuote = quoteMap.get(position.symbol);
    const currentPrice = liveQuote?.regularMarketPrice ?? position.lastPrice ?? position.avgCost;
    const marketValue = Number((currentPrice * position.quantity).toFixed(2));
    const costBasis = Number((position.avgCost * position.quantity).toFixed(2));
    const unrealizedPnl = Number((marketValue - costBasis).toFixed(2));

    return {
      ...position,
      currentPrice,
      marketValue,
      costBasis,
      unrealizedPnl,
      unrealizedPnlPercent: costBasis > 0 ? Number(((unrealizedPnl / costBasis) * 100).toFixed(2)) : 0,
      quote: liveQuote || null
    };
  });

  const totalMarketValue = hydratedPositions.reduce((sum, position) => sum + position.marketValue, 0);
  const totalCostBasis = hydratedPositions.reduce((sum, position) => sum + position.costBasis, 0);

  return {
    cashBalance: user?.cashBalance ?? 0,
    totalMarketValue: Number(totalMarketValue.toFixed(2)),
    totalEquity: Number((totalMarketValue + (user?.cashBalance ?? 0)).toFixed(2)),
    totalUnrealizedPnl: Number((totalMarketValue - totalCostBasis).toFixed(2)),
    positions: hydratedPositions
  };
}

export async function placeMarketOrder({ userId, symbol, assetType, side, quantity, metadata }) {
  const quote = assetType === 'stock' ? await getQuote(symbol) : null;
  const price = assetType === 'stock'
    ? quote?.regularMarketPrice
    : Number(metadata?.premium || metadata?.lastPrice || metadata?.marketPrice || 0);

  if (!price) {
    throw new Error('Unable to determine fill price');
  }

  const { trade, user } = await recordTrade({
    userId,
    symbol,
    assetType,
    side,
    quantity,
    price,
    metadata
  });

  return {
    status: 'filled',
    filledPrice: price,
    filledAt: new Date(),
    trade,
    user
  };
}

export async function processPendingOrders() {
  const openOrders = await Order.find({ status: 'open' }).lean();
  if (!openOrders.length) {
    return { processed: 0, filled: 0 };
  }

  const stockSymbols = [...new Set(openOrders.filter((order) => order.assetType === 'stock').map((order) => order.symbol))];
  const stockQuotes = await getQuotes(stockSymbols);
  const stockQuoteMap = new Map(stockQuotes.map((quote) => [quote.symbol, quote.regularMarketPrice]));

  let filled = 0;

  for (const order of openOrders) {
    let currentPrice = null;

    if (order.assetType === 'stock') {
      currentPrice = stockQuoteMap.get(order.symbol) ?? null;
    } else {
      currentPrice = Number(order.metadata?.marketPrice || order.metadata?.premium || order.limitPrice || order.stopPrice || 0);
    }

    if (!currentPrice) {
      continue;
    }

    const limitPrice = Number(order.limitPrice || 0);
    const stopPrice = Number(order.stopPrice || 0);
    const shouldFill =
      order.orderType === 'limit'
        ? (order.side === 'buy' ? currentPrice <= limitPrice : currentPrice >= limitPrice)
        : order.orderType === 'stop'
          ? (order.side === 'buy' ? currentPrice >= stopPrice : currentPrice <= stopPrice)
          : true;

    if (!shouldFill) {
      continue;
    }

    try {
      const executed = await recordTrade({
        userId: order.userId,
        symbol: order.symbol,
        assetType: order.assetType,
        side: order.side,
        quantity: order.quantity,
        price: currentPrice,
        metadata: order.metadata
      });

      await Order.findByIdAndUpdate(order._id, {
        status: 'filled',
        filledPrice: currentPrice,
        filledAt: new Date(),
        metadata: {
          ...order.metadata,
          tradeId: executed.trade._id.toString()
        }
      });

      filled += 1;
    } catch {
      await Order.findByIdAndUpdate(order._id, { status: 'rejected' });
    }
  }

  return { processed: openOrders.length, filled };
}