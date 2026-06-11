import http from 'node:http';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { attachWebSocketServer } from './services/websocket.js';
import { processPendingOrders } from './services/portfolio.js';

async function start() {
  await connectDb();

  const app = createApp();
  const server = http.createServer(app);

  attachWebSocketServer(server);

  setInterval(() => {
    processPendingOrders().catch((error) => console.error('Order processor failed:', error.message));
  }, env.orderCheckIntervalSeconds * 1000);

  server.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});