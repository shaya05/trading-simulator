import { useMemo, useState } from 'react';

function formatAxisTime(timestamp) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function PriceChart({ series = [], height = 220 }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [dragging, setDragging] = useState(false);

  const chart = useMemo(() => {
    const values = series.map((point) => Number(point.close)).filter((value) => Number.isFinite(value));

    if (!values.length) {
      return { points: [], min: 0, max: 0, yTicks: [], xTicks: [], width: 1000, margins: { top: 18, right: 20, bottom: 36, left: 72 } };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const width = 1000;
    const margins = { top: 18, right: 20, bottom: 36, left: 72 };
    const spread = max - min || 1;
    const usableWidth = width - margins.left - margins.right;
    const usableHeight = height - margins.top - margins.bottom;

    const points = series
      .map((point) => ({ timestamp: point.timestamp, value: Number(point.close) }))
      .filter((point) => Number.isFinite(point.value) && point.timestamp)
      .map((point, index, allPoints) => {
        const x = margins.left + (index / Math.max(allPoints.length - 1, 1)) * usableWidth;
        const y = margins.top + ((max - point.value) / spread) * usableHeight;
        return { ...point, x, y };
      });

    const yTicks = Array.from({ length: 5 }, (_unused, index) => {
      const fraction = index / 4;
      return {
        y: margins.top + usableHeight * fraction,
        value: max - spread * fraction,
      };
    });

    const xTickIndexes = [0, Math.floor(points.length / 3), Math.floor((points.length * 2) / 3), points.length - 1]
      .filter((index, position, all) => index >= 0 && all.indexOf(index) === position);

    const xTicks = xTickIndexes.map((index) => ({
      x: points[index].x,
      label: formatAxisTime(points[index].timestamp),
    }));

    return { points, min, max, yTicks, xTicks, width, margins };
  }, [height, series]);

  if (!chart.points.length) {
    return <div className="chart-empty">No price history available for this timeframe.</div>;
  }

  const activePoint = activeIndex == null ? chart.points.at(-1) : chart.points[activeIndex];

  function getNearestIndex(clientX, svgElement) {
    const rect = svgElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * chart.width;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    chart.points.forEach((point, index) => {
      const distance = Math.abs(point.x - x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  function handlePointerMove(event) {
    setActiveIndex(getNearestIndex(event.clientX, event.currentTarget));
  }

  function handlePointerDown(event) {
    setDragging(true);
    handlePointerMove(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp() {
    setDragging(false);
  }

  return (
    <div className="chart-shell">
      <svg
        className="price-chart"
        viewBox={`0 0 ${chart.width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Stock price history chart"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => !dragging && setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="chartGlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {chart.yTicks.map((tick, index) => (
          <g key={`y-${index}`}>
            <line x1={chart.margins.left} x2={chart.width - chart.margins.right} y1={tick.y} y2={tick.y} className="chart-gridline" />
            <text x={chart.margins.left - 10} y={tick.y + 4} textAnchor="end" className="chart-axis-label">
              ${tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {chart.xTicks.map((tick, index) => (
          <g key={`x-${index}`}>
            <line x1={tick.x} x2={tick.x} y1={chart.margins.top} y2={height - chart.margins.bottom} className="chart-gridline faint" />
            <text x={tick.x} y={height - 12} textAnchor="middle" className="chart-axis-label">
              {tick.label}
            </text>
          </g>
        ))}

        <line x1={chart.margins.left} y1={height - chart.margins.bottom} x2={chart.width - chart.margins.right} y2={height - chart.margins.bottom} className="chart-baseline" />

        {chart.points.slice(1).map((point, index) => {
          const previous = chart.points[index];
          const rising = point.value >= previous.value;

          return (
            <line
              key={`${point.timestamp}-${index}`}
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              className={rising ? 'chart-segment chart-up' : 'chart-segment chart-down'}
            />
          );
        })}

        <path
          d={`M ${chart.points.map((point) => `${point.x} ${point.y}`).join(' L ')}`}
          fill="none"
          stroke="url(#chartGlow)"
          strokeWidth="2.5"
          opacity="0.3"
        />

        {chart.points.map((point, index) => (
          <circle
            key={`${point.timestamp}-dot-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === chart.points.length - 1 ? 4 : 2}
            className={index === chart.points.length - 1 ? 'chart-last-point' : 'chart-point'}
          />
        ))}

        {activePoint ? (
          <g>
            <line x1={activePoint.x} x2={activePoint.x} y1={chart.margins.top} y2={height - chart.margins.bottom} className="chart-active-line" />
            <circle cx={activePoint.x} cy={activePoint.y} r="6" className="chart-hover-point" />
          </g>
        ) : null}
      </svg>

      {activePoint ? (
        <div
          className="chart-tooltip"
          style={{
            left: `${(activePoint.x / chart.width) * 100}%`,
            top: `${(activePoint.y / height) * 100}%`,
          }}
        >
          <strong>${activePoint.value.toFixed(2)}</strong>
          <span>{formatAxisTime(activePoint.timestamp)}</span>
        </div>
      ) : null}

      <div className="chart-scale">
        <span>High ${chart.max.toFixed(2)}</span>
        <span>Low ${chart.min.toFixed(2)}</span>
      </div>
    </div>
  );
}