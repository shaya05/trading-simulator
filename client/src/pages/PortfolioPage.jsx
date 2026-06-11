import { useEffect, useState } from 'react';
import PriceChart from '../components/PriceChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import { fetchStockSnapshot } from '../lib/market.js';

const timeframes = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

export function PortfolioPage() {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedRange, setSelectedRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadSnapshot(symbol, range = selectedRange) {
    setChartLoading(true);

    try {
      const snapshot = await fetchStockSnapshot(token, symbol, range);
      setSelectedSymbol(symbol);
      setSelectedQuote(snapshot.quote);
      setSelectedHistory(snapshot.history);
      setSelectedRange(range);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    apiFetch('/portfolio', { token })
      .then((snapshot) => {
        setPortfolio(snapshot);
        const firstPosition = snapshot.positions?.[0];

        if (firstPosition) {
          loadSnapshot(firstPosition.symbol, '24h');
        }
      })
      .catch((requestError) => {
        setPortfolio({ error: requestError.message });
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || !portfolio) {
    return <div className="panel">Loading portfolio...</div>;
  }

  if (portfolio.error) {
    return <div className="error-banner">{portfolio.error}</div>;
  }

  return (
    <div className="page-stack">
      <section className="panel-grid">
        <article className="panel"><span className="label">Cash</span><strong>${portfolio.cashBalance.toFixed(2)}</strong></article>
        <article className="panel"><span className="label">Market value</span><strong>${portfolio.totalMarketValue.toFixed(2)}</strong></article>
        <article className="panel"><span className="label">Equity</span><strong>${portfolio.totalEquity.toFixed(2)}</strong></article>
        <article className="panel"><span className="label">Unrealized P/L</span><strong className={portfolio.totalUnrealizedPnl >= 0 ? 'positive' : 'negative'}>${portfolio.totalUnrealizedPnl.toFixed(2)}</strong></article>
      </section>

      <section className="panel">
        <h2>Positions</h2>
        <div className="table-list">
          {portfolio.positions.map((position) => (
            <button
              key={`${position.symbol}-${position.assetType}`}
              className={`position-row ${selectedSymbol === position.symbol ? 'is-active' : ''}`}
              type="button"
              onClick={() => loadSnapshot(position.symbol, selectedRange)}
            >
              <span>{position.symbol}</span>
              <span>{position.assetType}</span>
              <span>Qty {position.quantity}</span>
              <span>Avg ${Number(position.avgCost).toFixed(2)}</span>
              <span>Last ${Number(position.currentPrice).toFixed(2)}</span>
              <span className={position.unrealizedPnl >= 0 ? 'positive' : 'negative'}>{position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}</span>
            </button>
          ))}
          {!portfolio.positions.length && <p className="muted">No positions yet.</p>}
        </div>
      </section>

      {selectedQuote ? (
        <section className="panel selected-stock-panel">
          <div className="selected-stock-head">
            <div>
              <h2>{selectedQuote.symbol} details</h2>
              <p className="muted">{selectedQuote.shortName}</p>
            </div>

            <div className="range-toggle">
              {timeframes.map((frame) => (
                <button
                  key={frame.value}
                  className={selectedRange === frame.value ? 'range-button is-active' : 'range-button'}
                  type="button"
                  onClick={() => loadSnapshot(selectedSymbol, frame.value)}
                >
                  {frame.label}
                </button>
              ))}
            </div>
          </div>

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
            <span>{chartLoading ? 'Refreshing...' : 'Live data'}</span>
          </div>
        </section>
      ) : (
        <section className="panel">
          <p className="muted">Click a position to inspect the chart.</p>
        </section>
      )}

      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}