import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      default: 0
    },
    avgCost: {
      type: Number,
      default: 0
    },
    lastPrice: {
      type: Number,
      default: 0
    },
    optionMeta: {
      contractSymbol: String,
      expirationDate: String,
      strike: Number,
      optionType: String
    }
  },
  { timestamps: true }
);

positionSchema.index({ userId: 1, symbol: 1, assetType: 1 }, { unique: true });

export const Position = mongoose.model('Position', positionSchema);