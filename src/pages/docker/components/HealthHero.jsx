import { useState } from 'react';

function Sparkline({ data, max }) {
  if (!data || data.length < 2) return <span className="hh-spark hh-spark-empty" />;
  const w = 120, h = 28, pad = 2;
  const top = max || Math.max(...data, 1);
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - v / top) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = data[data.length - 1];
  const lx = pad + (data.length - 1) * step;
  const ly = pad + (1 - last / top) * (h - pad * 2);
  return (
    <svg className="hh-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <circle cx={lx} cy={ly} r="2" fill="currentColor" />
    </svg>
  );
}

export default function HealthHero({ counts, history, restartingCount, infra }) {
  const [open, setOpen] = useState(false);
  const max = Math.max(counts.total || 1, ...(history || [0]));

  return (
    <div className="health-hero">
      <div className="hh-main">
        <div className="hh-headline">
          <span className="hh-num">{counts.up}</span>
          <span className="hh-of">/ {counts.total}</span>
          <span className="hh-label">running</span>
        </div>
        <div className="hh-spark-wrap" title={`${history?.length || 0} samples`}>
          <Sparkline data={history} max={max} />
        </div>
        <div className="hh-chips">
          <span className={'hh-chip' + (counts.down > 0 ? ' is-down' : '')}>
            <span className="status-dot down" />{counts.down} stopped
          </span>
          {restartingCount > 0 && (
            <span className="hh-chip is-warn">
              <span className="status-dot warn" />{restartingCount} restarting
            </span>
          )}
        </div>
        <button
          type="button"
          className={'hh-infra-toggle' + (open ? ' is-open' : '')}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          infra
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="hh-infra">
          <div className="hh-infra-cell"><div className="l">Stacks</div><div className="v">{infra.stacks ?? '—'}</div></div>
          <div className="hh-infra-cell"><div className="l">Images</div><div className="v">{infra.images ?? '—'}</div></div>
          <div className="hh-infra-cell"><div className="l">Networks</div><div className="v">{infra.networks ?? '—'}</div></div>
          <div className="hh-infra-cell"><div className="l">Volumes</div><div className="v">{infra.volumes ?? '—'}</div></div>
        </div>
      )}
    </div>
  );
}
