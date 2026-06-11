import { useEffect, useState } from 'react';
import { apiFetch, createSocketUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PriceChart from '../components/PriceChart.jsx';
import { fetchStockSnapshot, fetchTrendingQuotes } from '../lib/market.js';

const timeframes = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

function TickerBadge({ symbol }) {
  return <span className="ticker-badge">{symbol.slice(0, 4)}</span>;
}

export function DashboardPage() {
  const { token } = useAuth();
  const [watchlistQuotes, setWatchlistQuotes] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedRange, setSelectedRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSymbol, setLoadingSymbol] = useState(false);
  const [error, setError] = useState('');

  async function loadSnapshot(symbol, range = selectedRange) {
    setLoadingSymbol(true);
    setError('');

    try {
      const snapshot = await fetchStockSnapshot(token, symbol, range);
      setSelectedSymbol(symbol);
      setSelectedQuote(snapshot.quote);
      setSelectedHistory(snapshot.history);
      setSelectedRange(range);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingSymbol(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    fetchTrendingQuotes(token)
      .then(async ({ quotes }) => {
        if (!mounted) {
          return;
        }

        setWatchlistQuotes(quotes || []);
        setWatchlistLoading(false);

        if (quotes?.[0]) {
          await loadSnapshot(quotes[0].symbol, '24h');
        }
      })
      .catch((requestError) => {
        if (!mounted) {
          return;
        }

        setError(requestError.message);
        setWatchlistLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!watchlistQuotes.length) {
      return undefined;
    }

    const socket = new WebSocket(createSocketUrl());

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', symbols: watchlistQuotes.map((quote) => quote.symbol) }));
    });

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === 'quotes') {
        setWatchlistQuotes((currentQuotes) => {
          const quoteMap = new Map((payload.quotes || []).map((quote) => [quote.symbol, quote]));

          return currentQuotes.map((quote) => quoteMap.get(quote.symbol) || quote);
        });
      }
    });

    return () => socket.close();
  }, [watchlistQuotes.length]);

  async function runSearch(event) {
    event.preventDefault();
    setError('');

    try {
      const response = await apiFetch(`/market/search?q=${encodeURIComponent(searchQuery)}`, { token });
      setSearchResults(response.results || []);
    } catch (requestError) {
      setSearchResults([]);
      setError(requestError.message);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Market dashboard</p>
          <h1>Watch the market, practice trades, and study price behavior.</h1>
          <p className="muted">Trending stocks update faster now, and you can inspect a selected stock across 24 hours, 7 days, 1 year, or 5 years.</p>
        </div>

        <form className="search-row" onSubmit={runSearch}>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search symbol or company" />
          <button className="primary-button" type="submit">Search</button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Trending watchlist</h2>
            <p className="muted">Top 10 trending U.S. symbols. Scroll sideways to see the full list.</p>
          </div>
        </div>

        {watchlistLoading ? (
          <div className="watchlist-loading">Loading trending symbols...</div>
        ) : (
          <div className="watchlist-strip">
            {watchlistQuotes.map((quote) => (
              <button
                key={quote.symbol}
                className={`watchlist-card ${selectedSymbol === quote.symbol ? 'is-active' : ''}`}
                type="button"
                onClick={() => loadSnapshot(quote.symbol, selectedRange)}
              >
                <TickerBadge symbol={quote.symbol} />
                <span className="watchlist-symbol">{quote.symbol}</span>
                <strong>{quote.shortName}</strong>
                <span className="watchlist-price">${Number(quote.regularMarketPrice || 0).toFixed(2)}</span>
                <span className={quote.regularMarketChangePercent >= 0 ? 'positive' : 'negative'}>
                  {Number.isFinite(quote.regularMarketChangePercent) ? `${quote.regularMarketChangePercent.toFixed(2)}%` : '—'}
                </span>
                <span className="watchlist-session">{quote.marketSessionLabel}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {searchResults.length ? (
        <section className="panel">
          <h2>Search results</h2>
          <div className="result-list">
            {searchResults.map((quote) => (
              <button key={quote.symbol} className="result-card" type="button" onClick={() => loadSnapshot(quote.symbol, selectedRange)}>
                <TickerBadge symbol={quote.symbol} />
                <div>
                  <strong>{quote.symbol}</strong>
                  <p>{quote.shortName}</p>
                </div>
                <span className="result-session">{quote.exchange || quote.quoteType || 'Result'}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel selected-stock-panel">
        <div className="selected-stock-head">
          <div>
            <h2>{selectedQuote ? `${selectedQuote.symbol} details` : 'Selected stock'}</h2>
            <p className="muted">{selectedQuote ? selectedQuote.shortName : 'Pick a stock from the watchlist or search results.'}</p>
          </div>

          <div className="range-toggle">
            {timeframes.map((frame) => (
              <button
                key={frame.value}
                className={selectedRange === frame.value ? 'range-button is-active' : 'range-button'}
                type="button"
                onClick={() => selectedSymbol && loadSnapshot(selectedSymbol, frame.value)}
              >
                {frame.label}
              </button>
            ))}
          </div>
        </div>

        {selectedQuote ? (
          <>
            <div className="quote-grid compact">
              <div><span className="label">Price</span><strong>${Number(selectedQuote.regularMarketPrice || 0).toFixed(2)}</strong></div>
              <div><span className="label">Change</span><strong className={selectedQuote.regularMarketChangePercent >= 0 ? 'positive' : 'negative'}>{Number.isFinite(selectedQuote.regularMarketChangePercent) ? `${selectedQuote.regularMarketChangePercent.toFixed(2)}%` : '—'}</strong></div>
              <div><span className="label">Trading session</span><strong>{selectedQuote.marketSessionLabel}</strong></div>
              <div><span className="label">Session meaning</span><strong className="small-copy">{selectedQuote.marketSessionDescription}</strong></div>
            </div>

            <PriceChart series={selectedHistory} />

            <div className="selected-stock-meta">
              <span>{selectedQuote.exchangeName || 'Exchange unknown'}</span>
              <span>{selectedQuote.currency}</span>
              <span>{loadingSymbol ? 'Refreshing...' : 'Live data'}</span>
            </div>
          </>
        ) : (
          <p className="muted">Select a stock to see its live quote and history chart.</p>
        )}
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}