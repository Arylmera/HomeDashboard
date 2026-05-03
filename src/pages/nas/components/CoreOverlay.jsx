import { useMemo, useState } from 'react';
import MultiLineChart from './MultiLineChart.jsx';
import CoreGauges from './CoreGauges.jsx';

const PALETTE = [
  'oklch(0.78 0.16 30)',
  'oklch(0.78 0.14 145)',
  'oklch(0.78 0.14 230)',
  'oklch(0.78 0.14 300)',
  'oklch(0.82 0.14 90)',
  'oklch(0.78 0.14 200)',
  'oklch(0.78 0.16 0)',
  'oklch(0.78 0.14 260)',
];

const stat = (arr) => {
  if (!arr || !arr.length) return { mean: null, last: null, max: null, min: null };
  const last = arr[arr.length - 1];
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return { mean, last, max, min };
};

export default function CoreOverlay({ cores, tempHistory, usageHistory }) {
  const [mode, setMode] = useState('temp');
  const [view, setView] = useState('gauge');
  const [hidden, setHidden] = useState({});
  const [hoverKey, setHoverKey] = useState(null);

  const series = useMemo(() => {
    const src = mode === 'temp' ? tempHistory : usageHistory;
    return cores.map((c) => ({
      key: `c${c.i}`,
      label: `Core ${c.i}`,
      color: PALETTE[c.i % PALETTE.length],
      data: (src && src[c.i]) || [],
    }));
  }, [cores, tempHistory, usageHistory, mode]);

  const fmt = mode === 'temp'
    ? (v) => `${Math.round(v)}°`
    : (v) => `${Math.round(v)}%`;
  const domain = mode === 'temp' ? [30, 90] : [0, 100];
  const unit = mode === 'temp' ? '°' : '%';
  const [lo, hi] = domain;

  const stats = useMemo(() => series.map(s => stat(s.data)), [series]);
  const overall = useMemo(() => {
    const lasts = stats.map(s => s.last).filter(v => v != null);
    const maxes = stats.map(s => s.max).filter(v => v != null);
    const means = stats.map(s => s.mean).filter(v => v != null);
    return {
      lastAvg: lasts.length ? lasts.reduce((a, b) => a + b, 0) / lasts.length : null,
      peak: maxes.length ? Math.max(...maxes) : null,
      meanAvg: means.length ? means.reduce((a, b) => a + b, 0) / means.length : null,
    };
  }, [stats]);

  const toggle = (k) => setHidden(prev => ({ ...prev, [k]: !prev[k] }));

  const hotColor = (v) => {
    if (v == null) return undefined;
    if (mode === 'temp') {
      if (v >= 80) return 'var(--status-down)';
      if (v >= 70) return 'var(--status-warn)';
    } else {
      if (v >= 90) return 'var(--status-down)';
      if (v >= 75) return 'var(--status-warn)';
    }
    return undefined;
  };

  return (
    <div className="nas-card nas-overlay">
      <div className="overlay-head">
        <div className="seg" role="tablist" aria-label="metric">
          <button
            className={mode === 'temp' ? 'on' : ''}
            onClick={() => setMode('temp')}
            role="tab"
            aria-selected={mode === 'temp'}
          >
            <span className="dot" /> Temperature
          </button>
          <button
            className={mode === 'load' ? 'on' : ''}
            onClick={() => setMode('load')}
            role="tab"
            aria-selected={mode === 'load'}
          >
            <span className="dot" /> Load
          </button>
        </div>

        <div className="seg seg-view" role="tablist" aria-label="view">
          <button
            className={view === 'chart' ? 'on' : ''}
            onClick={() => setView('chart')}
            role="tab"
            aria-selected={view === 'chart'}
            title="line chart"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-6 4 4 8-10" /></svg>
            chart
          </button>
          <button
            className={view === 'gauge' ? 'on' : ''}
            onClick={() => setView('gauge')}
            role="tab"
            aria-selected={view === 'gauge'}
            title="gauges"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16a8 8 0 0 1 16 0" /><path d="M12 16l4-4" /></svg>
            gauges
          </button>
        </div>

        <div className="overlay-kpis">
          <div className="kpi">
            <span className="kpi-l">avg now</span>
            <span className="kpi-v" style={{ color: hotColor(overall.lastAvg) }}>
              {overall.lastAvg != null ? `${Math.round(overall.lastAvg)}${unit}` : '—'}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-l">peak 5m</span>
            <span className="kpi-v" style={{ color: hotColor(overall.peak) }}>
              {overall.peak != null ? `${Math.round(overall.peak)}${unit}` : '—'}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-l">cores</span>
            <span className="kpi-v">{cores.length}</span>
          </div>
        </div>
      </div>

      {view === 'chart' ? (
        <div className="overlay-chart">
          <MultiLineChart
            series={series}
            h={200}
            domain={domain}
            format={fmt}
            hidden={hidden}
            highlight={hoverKey}
          />
        </div>
      ) : (
        <CoreGauges cores={cores} mode={mode} />
      )}

      {view === 'chart' && <div className="overlay-legend">
        <div className="legend-row legend-head">
          <span></span>
          <span>core</span>
          <span>now</span>
          <span>mean</span>
          <span>peak</span>
          <span>trend</span>
        </div>
        {series.map((s, idx) => {
          const st = stats[idx];
          const off = !!hidden[s.key];
          const pct = st.last != null ? Math.max(0, Math.min(1, (st.last - lo) / (hi - lo))) : 0;
          return (
            <button
              key={s.key}
              className={`legend-row ${off ? 'off' : ''}`}
              onClick={() => toggle(s.key)}
              onMouseEnter={() => setHoverKey(s.key)}
              onMouseLeave={() => setHoverKey(null)}
              type="button"
            >
              <span className="swatch" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <span className="name">{s.label}</span>
              <span className="val now" style={{ color: off ? undefined : (hotColor(st.last) ?? s.color) }}>
                {st.last != null ? `${Math.round(st.last)}${unit}` : '—'}
              </span>
              <span className="val">{st.mean != null ? `${Math.round(st.mean)}${unit}` : '—'}</span>
              <span className="val" style={{ color: off ? undefined : hotColor(st.max) }}>
                {st.max != null ? `${Math.round(st.max)}${unit}` : '—'}
              </span>
              <span className="trend">
                <span className="trend-track">
                  <span
                    className="trend-fill"
                    style={{ width: `${pct * 100}%`, background: s.color }}
                  />
                </span>
              </span>
            </button>
          );
        })}
      </div>}
    </div>
  );
}
