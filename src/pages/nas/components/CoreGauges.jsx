import { useMemo } from 'react';

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

const SIZE = 120;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;
const ARC_DEG = 270;
const START_DEG = 135;

const polar = (deg) => {
  const r = (deg - 90) * (Math.PI / 180);
  return { x: CX + R * Math.cos(r), y: CY + R * Math.sin(r) };
};

const arcPath = (fromDeg, toDeg) => {
  const a = polar(fromDeg);
  const b = polar(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
};

const trackPath = arcPath(START_DEG, START_DEG + ARC_DEG);
const C = (Math.PI * R * ARC_DEG) / 180;

export default function CoreGauges({ cores, mode }) {
  const cfg = mode === 'temp'
    ? { lo: 30, hi: 90, unit: '°', warn: 70, crit: 80 }
    : { lo: 0, hi: 100, unit: '%', warn: 75, crit: 90 };

  const items = useMemo(() => cores.map((c) => {
    const raw = mode === 'temp' ? c.temp : c.usage;
    const v = raw == null ? null : raw;
    const pct = v == null ? 0 : Math.max(0, Math.min(1, (v - cfg.lo) / (cfg.hi - cfg.lo)));
    let color = PALETTE[c.i % PALETTE.length];
    let state = 'ok';
    if (v != null) {
      if (v >= cfg.crit) { color = 'var(--status-down)'; state = 'crit'; }
      else if (v >= cfg.warn) { color = 'var(--status-warn)'; state = 'warn'; }
    }
    return { i: c.i, v, pct, color, state };
  }), [cores, mode, cfg.lo, cfg.hi, cfg.warn, cfg.crit]);

  return (
    <div className="core-gauges">
      {items.map((g) => {
        const dash = `${C * g.pct} ${C}`;
        return (
          <div key={g.i} className={`gauge gauge-${g.state}`}>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
              <path d={trackPath} className="gauge-track" fill="none" strokeWidth={STROKE} strokeLinecap="round" />
              <path
                d={trackPath}
                className="gauge-fill"
                fill="none"
                stroke={g.color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={dash}
                style={{ filter: `drop-shadow(0 0 6px ${g.color})` }}
              />
            </svg>
            <div className="gauge-center">
              <div className="gauge-val" style={{ color: g.color }}>
                {g.v != null ? Math.round(g.v) : '—'}
                <span className="gauge-unit">{g.v != null ? cfg.unit : ''}</span>
              </div>
              <div className="gauge-lbl">core {g.i}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
