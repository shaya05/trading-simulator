import { WebSocketServer } from 'ws';
import { env } from '../config/env.js';
import { getQuotes } from './yahoo.js';

const subscriptions = new Map();

function safeSend(socket, payload) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

async function pushUpdates() {
  const allSymbols = [...new Set([...subscriptions.values()].flatMap((symbols) => symbols))];
  if (!allSymbols.length) {
    return;
  }

  const quotes = await getQuotes(allSymbols);
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));

  for (const [socket, symbols] of subscriptions.entries()) {
    const filtered = symbols.map((symbol) => quoteMap.get(symbol)).filter(Boolean);
    safeSend(socket, {
      type: 'quotes',
      timestamp: new Date().toISOString(),
      quotes: filtered
    });
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    subscriptions.set(socket, ['AAPL', 'MSFT', 'NVDA', 'SPY']);
    safeSend(socket, { type: 'connected', message: 'Subscribed to default watchlist' });

    socket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());

        if (message.type === 'subscribe' && Array.isArray(message.symbols)) {
          const nextSymbols = message.symbols.map((symbol) => String(symbol).toUpperCase()).filter(Boolean);
          subscriptions.set(socket, nextSymbols);
          safeSend(socket, { type: 'subscribed', symbols: nextSymbols });
        }
      } catch {
        safeSend(socket, { type: 'error', message: 'Invalid WebSocket message' });
      }
    });

    socket.on('close', () => {
      subscriptions.delete(socket);
    });
  });

  const interval = setInterval(() => {
    pushUpdates().catch((error) => console.error('WebSocket price push failed:', error.message));
  }, env.marketUpdateIntervalSeconds * 1000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}