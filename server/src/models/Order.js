import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    assetType: {
      type: String,
      enum: ['stock', 'option'],
      default: 'stock'
    },
    side: {
      type: String,
      enum: ['buy', 'sell'],
      required: true
    },
    orderType: {
      type: String,
      enum: ['market', 'limit', 'stop'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    limitPrice: Number,
    stopPrice: Number,
    status: {
      type: String,
      enum: ['open', 'filled', 'cancelled', 'rejected'],
      default: 'open'
    },
    filledPrice: Number,
    filledAt: Date,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);