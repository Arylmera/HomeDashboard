import { useEffect, useMemo, useRef, useState } from 'react';
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

const TICK_MS = 5_000;

const WINDOWS = [
  { ms: 5  * 60_000,    label: '5m'  },
  { ms: 15 * 60_000,    label: '15m' },
  { ms: 60 * 60_000,    label: '1h'  },
  { ms: 6  * 3_600_000, label: '6h'  },
  { ms: 24 * 3_600_000, label: '24h' },
];

const stat = (arr) => {
  if (!arr || !arr.length) return { mean: null, last: null, max: null, min: null };
  const last = arr[arr.length - 1];
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return { mean, last, max, min };
};

// Drop pairs older than the window cutoff. Pairs are [t, v] sorted ascending.
function trimPairs(pairs, windowMs, now) {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < pairs.length && pairs[i][0] < cutoff) i++;
  return i === 0 ? pairs : pairs.slice(i);
}

// Time-bucket downsample: align to fixed bucket boundaries so every core's
// series shares the same time grid (keeps cross-core hover meaningful).
// Each bucket collapses to its mean.
function downsamplePairs(pairs, target, windowMs, now) {
  if (!pairs || pairs.length <= target) {
    return [pairs.map(p => p[1]), pairs.map(p => p[0])];
  }
  const bucketMs = Math.max(1, Math.ceil(windowMs / target));
  const start = now - windowMs;
  const buckets = new Map();
  for (const [t, v] of pairs) {
    const b = Math.floor((t - start) / bucketMs);
    const cur = buckets.get(b);
    if (cur) { cur.s += v; cur.n += 1; }
    else buckets.set(b, { s: v, n: 1 });
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const outV = new Array(keys.length);
  const outT = new Array(keys.length);
  for (let i = 0; i < keys.length; i++) {
    const b = keys[i];
    const e = buckets.get(b);
    outV[i] = e.s / e.n;
    outT[i] = start + b * bucketMs + Math.floor(bucketMs / 2);
  }
  return [outV, outT];
}

export default function CoreOverlay({ cores, usageHistory }) {
  const [mode, setMode] = useState('temp');
  const [view, setView] = useState('gauge');
  const [windowMs, setWindowMs] = useState(WINDOWS[0].ms);
  const [hidden, setHidden] = useState({});
  const [hoverKey, setHoverKey] = useState(null);

  // Pair buffers: { [coreIdx]: [[t, v], ...] } sorted by t ascending.
  const [tempBuf,  setTempBuf]  = useState({});
  const [usageBuf, setUsageBuf] = useState({});

  const lastLiveRef = useRef(0);

  // Seed/reseed temp buffer from the server when the window changes.
  // Merges fetched pairs with whatever live samples landed during the await,
  // de-duplicating by timestamp so no tick is dropped.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const since = Date.now() - windowMs;
        const r = await fetch(`/api/metrics?since=${since}`);
        if (!r.ok) return;
        const data = await r.json();
        if (!alive) return;
        const seed = {};
        for (const k of Object.keys(data)) {
          const m = k.match(/^cpu\.temp\.(\d+)$/);
          if (!m) continue;
          seed[+m[1]] = data[k]; // [[t, v], ...]
        }
        setTempBuf(prev => {
          const next = {};
          const keys = new Set([...Object.keys(prev), ...Object.keys(seed)]);
          for (const k of keys) {
            const byT = new Map();
            for (const p of (seed[k] || [])) byT.set(p[0], p[1]);
            for (const p of (prev[k] || [])) if (!byT.has(p[0])) byT.set(p[0], p[1]);
            next[k] = [...byT.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([t, v]) => [t, v]);
          }
          return next;
        });
      } catch (e) {
        console.warn('[nas] temp seed failed:', e?.message || e);
      }
    })();
    return () => { alive = false; };
  }, [windowMs]);

  // Seed usage buffer from any pre-existing live data passed in (no server
  // history for usage). Only seeds when our local buffer is empty so we never
  // clobber accumulated samples.
  useEffect(() => {
    if (!usageHistory) return;
    const hasLocal = Object.values(usageBuf).some(arr => arr && arr.length);
    if (hasLocal) return;
    const now = Date.now();
    const next = {};
    for (const k of Object.keys(usageHistory)) {
      const arr = usageHistory[k] || [];
      if (!arr.length) continue;
      // Synthesize timestamps backwards from now at TICK_MS spacing.
      next[k] = arr.map((v, i) => [now - (arr.length - 1 - i) * TICK_MS, v]);
    }
    if (Object.keys(next).length) setUsageBuf(next);
  }, [usageHistory, usageBuf]);

  // Live append from `cores` prop (one tick covers both temp and load).
  useEffect(() => {
    if (!cores.length) return;
    const now = Date.now();
    if (now - lastLiveRef.current < TICK_MS) return;
    lastLiveRef.current = now;

    const append = (buf, getValue) => {
      const next = { ...buf };
      for (const c of cores) {
        const v = getValue(c);
        if (v == null) continue;
        const arr = (next[c.i] || []).slice();
        arr.push([now, v]);
        next[c.i] = trimPairs(arr, windowMs, now);
      }
      return next;
    };
    setTempBuf(prev  => append(prev, c => c.temp));
    setUsageBuf(prev => append(prev, c => c.usage));
  }, [cores, windowMs]);

  // Trim buffers when the window shrinks.
  useEffect(() => {
    const now = Date.now();
    const trimAll = (buf) => {
      const next = {};
      for (const k of Object.keys(buf)) next[k] = trimPairs(buf[k] || [], windowMs, now);
      return next;
    };
    setTempBuf(trimAll);
    setUsageBuf(trimAll);
  }, [windowMs]);

  // Smaller targets for longer windows so the line stays legible.
  const targetPoints = windowMs >= 6 * 3_600_000 ? 160
                     : windowMs >= 60 * 60_000   ? 200
                     : 240;

  const series = useMemo(() => {
    const src = mode === 'temp' ? tempBuf : usageBuf;
    const now = Date.now();
    return cores.map((c) => {
      const pairs = (src && src[c.i]) || [];
      const [dv, dt] = downsamplePairs(pairs, targetPoints, windowMs, now);
      return {
        key: `c${c.i}`,
        label: `Core ${c.i}`,
        color: PALETTE[c.i % PALETTE.length],
        data: dv,
        times: dt,
      };
    });
  }, [cores, tempBuf, usageBuf, mode, targetPoints, windowMs]);

  const fmt = mode === 'temp'
    ? (v) => `${Math.round(v)}°`
    : (v) => `${Math.round(v)}%`;
  const unit = mode === 'temp' ? '°' : '%';

  // Load is bounded; temp auto-fits to observed min/max with headroom,
  // snapped to 5° steps. Floored at 20° / capped at 110° for sane axes.
  const domain = useMemo(() => {
    if (mode === 'load') return [0, 100];
    const all = [];
    for (const s of series) for (const v of s.data) if (v != null && Number.isFinite(v)) all.push(v);
    if (all.length < 2) return [30, 90];
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    const span = Math.max(6, hi - lo);
    lo -= span * 0.15;
    hi += span * 0.15;
    lo = Math.max(20, Math.floor(lo / 5) * 5);
    hi = Math.min(110, Math.ceil(hi / 5) * 5);
    if (hi - lo < 10) hi = lo + 10;
    return [lo, hi];
  }, [series, mode]);
  const [lo, hi] = domain;
  const windowLabel = WINDOWS.find(w => w.ms === windowMs)?.label || '';

  // Stats from raw (un-downsampled) buffers so peak/mean stay accurate.
  const stats = useMemo(() => {
    const src = mode === 'temp' ? tempBuf : usageBuf;
    return cores.map(c => {
      const pairs = (src && src[c.i]) || [];
      return stat(pairs.map(p => p[1]));
    });
  }, [cores, tempBuf, usageBuf, mode]);
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

        {view === 'chart' && (
          <div className="seg seg-window" role="tablist" aria-label="window">
            {WINDOWS.map(w => (
              <button
                key={w.ms}
                className={windowMs === w.ms ? 'on' : ''}
                onClick={() => setWindowMs(w.ms)}
                role="tab"
                aria-selected={windowMs === w.ms}
                title={`window: ${w.label}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}

        <div className="overlay-kpis">
          <div className="kpi">
            <span className="kpi-l">avg now</span>
            <span className="kpi-v" style={{ color: hotColor(overall.lastAvg) }}>
              {overall.lastAvg != null ? `${Math.round(overall.lastAvg)}${unit}` : '—'}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-l">peak {windowLabel}</span>
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
            axisLabel={windowLabel}
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
