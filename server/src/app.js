import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import portfolioRoutes from './routes/portfolio.js';
import orderRoutes from './routes/orders.js';
import researchRoutes from './routes/research.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api', requireAuth);
  app.use('/api/market', marketRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/research', researchRoutes);

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(error.statusCode || 500).json({ message: error.message || 'Internal server error' });
  });

  return app;
}