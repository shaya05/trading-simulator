import { useState } from 'react';
import { apiFetch } from '../api/client.js';
import PriceChart from '../components/PriceChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const timeframes = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

export function ResearchPage() {
  const { token } = useAuth();
  const [symbol, setSymbol] = useState('AAPL');
  const [range, setRange] = useState('1y');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runResearch() {
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const data = await apiFetch(`/research/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`, { token });
      setResult(data);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel hero-panel compact-hero">
        <div>
          <p className="eyebrow">Research assistant</p>
          <h1>Get a beginner-friendly bull case, bear case, risks, and advice.</h1>
          <p className="muted">The chart below uses Yahoo Finance history data for the selected time range.</p>
        </div>

        <div className="research-controls">
          <div className="search-row">
            <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="AAPL" />
            <button className="primary-button" type="button" onClick={runResearch}>Analyze</button>
          </div>

          <div className="range-toggle">
            {timeframes.map((frame) => (
              <button
                key={frame.value}
                className={range === frame.value ? 'range-button is-active' : 'range-button'}
                type="button"
                onClick={() => setRange(frame.value)}
              >
                {frame.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      {result ? (
        <>
          <section className="panel selected-stock-panel">
            <div className="selected-stock-head">
              <div>
                <h2>{result.quote.symbol} overview</h2>
                <p className="muted">{result.quote.shortName}</p>
              </div>

              <div className="market-session-card">
                <strong>{result.quote.marketSessionLabel}</strong>
                <span>{result.quote.marketSessionDescription}</span>
              </div>
            </div>

            <div className="quote-grid compact">
              <div><span className="label">Price</span><strong>${Number(result.quote.regularMarketPrice || 0).toFixed(2)}</strong></div>
              <div><span className="label">Change</span><strong className={result.quote.regularMarketChangePercent >= 0 ? 'positive' : 'negative'}>{Number.isFinite(result.quote.regularMarketChangePercent) ? `${result.quote.regularMarketChangePercent.toFixed(2)}%` : '—'}</strong></div>
              <div><span className="label">Exchange</span><strong>{result.quote.exchangeName || 'Unknown'}</strong></div>
              <div><span className="label">Currency</span><strong>{result.quote.currency}</strong></div>
            </div>

            <PriceChart series={result.history} />
          </section>

          <section className="panel research-analysis">
            <h2>AI analysis</h2>
            <pre className="code-block analysis-block">{result.analysis}</pre>
          </section>
        </>
      ) : (
        <section className="panel">
          <p className="muted">{loading ? 'Loading research...' : 'Run an analysis to see the chart and Gemini summary here.'}</p>
        </section>
      )}
    </div>
  );
}