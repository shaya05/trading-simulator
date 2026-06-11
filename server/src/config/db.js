import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  if (!env.mongoUri) {
    console.warn('MONGODB_URI is not set. Protected Mongo-backed routes will be unavailable until it is configured.');
    return false;
  }

  try {
    await mongoose.connect(env.mongoUri);
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    return false;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}