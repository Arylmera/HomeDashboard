import { useMemo, useState } from 'react';
import { smoothPath } from '../utils.js';

export default function MultiLineChart({
  series,
  w = 900,
  h = 260,
  domain = null,
  pad = 0.08,
  format = (v) => Math.round(v),
  axisLabel = '5m',
  smooth = true,
  hidden = {},
  highlight = null,
  onHover = null,
}) {
  const visible = series.filter(s => !hidden[s.key] && s.data && s.data.length > 1);

  const scale = useMemo(() => {
    if (!visible.length) return null;
    const all = visible.flatMap(s => s.data);
    if (all.length < 2) return null;
    let lo, hi;
    if (domain) { [lo, hi] = domain; }
    else {
      lo = Math.min(...all); hi = Math.max(...all);
      const span = (hi - lo) || Math.max(1, Math.abs(hi) * 0.1);
      lo -= span * pad; hi += span * pad;
    }
    const span = (hi - lo) || 1;
    const maxLen = Math.max(...visible.map(s => s.data.length));
    return { lo, hi, span, maxLen };
  }, [visible, domain, pad]);

  const [hover, setHover] = useState(null);

  if (!scale) {
    return <div className="nas-multichart empty">no samples yet · live data accrues every 5 s</div>;
  }

  const padTop = 16, padBot = 22, padLeft = 42, padRight = 14;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBot;
  const stepX = innerW / Math.max(1, scale.maxLen - 1);
  const yOf = (v) => padTop + innerH - ((v - scale.lo) / scale.span) * innerH;
  const xOf = (i, len) => padLeft + (i + (scale.maxLen - len)) * stepX;

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round((px - padLeft) / stepX);
    if (idx >= 0 && idx < scale.maxLen) {
      setHover(idx);
      onHover?.(idx);
    }
  };
  const onLeave = () => { setHover(null); onHover?.(null); };

  return (
    <svg
      className="nas-multichart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <defs>
        {visible.map((s) => (
          <linearGradient key={s.key} id={`mc-grad-${s.key}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
        <filter id="mc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {gridLevels.map((g, i) => {
        const y = padTop + innerH * g;
        const v = scale.hi - (scale.hi - scale.lo) * g;
        return (
          <g key={i}>
            <line x1={padLeft} x2={w - padRight} y1={y} y2={y}
              stroke="currentColor" strokeOpacity={i === gridLevels.length - 1 ? 0.18 : 0.06}
              strokeDasharray={i === gridLevels.length - 1 ? '0' : '2 5'}
              vectorEffect="non-scaling-stroke" />
            <text x={padLeft - 8} y={y + 3} textAnchor="end"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fill: 'currentColor', fillOpacity: 0.5, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
              {format(v)}
            </text>
          </g>
        );
      })}

      <text x={padLeft} y={h - 6}
        style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fill: 'currentColor', fillOpacity: 0.4, letterSpacing: '0.08em' }}>
        −{axisLabel}
      </text>
      <text x={w - padRight} y={h - 6} textAnchor="end"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fill: 'currentColor', fillOpacity: 0.4, letterSpacing: '0.08em' }}>
        NOW
      </text>

      {visible.map((s) => {
        const isHi = highlight === s.key;
        const dim = highlight && !isHi;
        const pts = s.data.map((v, i) => [xOf(i, s.data.length), yOf(v)]);
        const line = smooth
          ? smoothPath(pts)
          : pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
        const area = `${line} L ${pts[pts.length - 1][0]} ${padTop + innerH} L ${pts[0][0]} ${padTop + innerH} Z`;
        const last = pts[pts.length - 1];
        return (
          <g key={s.key} opacity={dim ? 0.18 : 1} style={{ transition: 'opacity 160ms' }}>
            {isHi && <path d={area} fill={`url(#mc-grad-${s.key})`} />}
            <path d={line} fill="none" stroke={s.color}
              strokeWidth={isHi ? 2.2 : 1.4}
              strokeLinejoin="round" strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={isHi ? 1 : 0.85}
              filter={isHi ? 'url(#mc-glow)' : undefined} />
            <circle cx={last[0]} cy={last[1]} r={isHi ? 3.2 : 2.2} fill={s.color}
              stroke="var(--bg-card, #0a0a0a)" strokeWidth="1.4" />
          </g>
        );
      })}

      {hover != null && (() => {
        const x = padLeft + hover * stepX;
        const ref = visible.find(s => s.times && s.times.length === scale.maxLen) || visible.find(s => s.times && s.times.length);
        let label = null;
        if (ref?.times?.length) {
          const refOffset = scale.maxLen - ref.times.length;
          const tIdx = hover - refOffset;
          if (tIdx >= 0 && tIdx < ref.times.length) {
            const t = ref.times[tIdx];
            const d = new Date(t);
            const ageSec = Math.max(0, Math.round((Date.now() - t) / 1000));
            const ago = ageSec < 60
              ? `${ageSec}s ago`
              : ageSec < 3600
                ? `${Math.round(ageSec / 60)}m ago`
                : `${Math.round(ageSec / 360) / 10}h ago`;
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            label = `${hh}:${mm}:${ss} · ${ago}`;
          }
        }
        const labelW = 132;
        const lx = Math.min(Math.max(x - labelW / 2, padLeft + 2), w - padRight - labelW - 2);
        return (
          <g>
            <line x1={x} x2={x} y1={padTop} y2={h - padBot}
              stroke="currentColor" strokeOpacity="0.28" strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke" />
            {visible.map(s => {
              const offset = scale.maxLen - s.data.length;
              const localIdx = hover - offset;
              if (localIdx < 0 || localIdx >= s.data.length) return null;
              const v = s.data[localIdx];
              return (
                <circle key={s.key} cx={x} cy={yOf(v)} r="3.2" fill={s.color}
                  stroke="var(--bg-card, #0a0a0a)" strokeWidth="1.4" />
              );
            })}
            {label && (
              <g pointerEvents="none">
                <rect x={lx} y={padTop + 2} width={labelW} height={20} rx="4"
                  fill="oklch(0.18 0 0 / 0.85)"
                  stroke="currentColor" strokeOpacity="0.2"
                  vectorEffect="non-scaling-stroke" />
                <text x={lx + labelW / 2} y={padTop + 16} textAnchor="middle"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fill: 'currentColor', fillOpacity: 0.92, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })()}
    </svg>
  );
}
