import { usePlexUI } from '../PlexContext.jsx';

const STAGES = [
  { id: 'request',  n: '01', t: 'Request',  d: 'ask' },
  { id: 'index',    n: '02', t: 'Index',    d: 'find' },
  { id: 'acquire',  n: '03', t: 'Acquire',  d: 'automate' },
  { id: 'download', n: '04', t: 'Download', d: 'fetch' },
  { id: 'serve',    n: '05', t: 'Serve',    d: 'stream' },
  { id: 'monitor',  n: '06', t: 'Monitor',  d: 'watch' },
];

function fmtCount(v) {
  if (v == null) return null;
  if (typeof v === 'number' && v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v;
}

export function Pipeline({ counts = {} }) {
  const { stage, toggleStage } = usePlexUI();

  return (
    <>
      <div className="nas-section-title">
        <span className="numeral">flow</span>
        <h2>From request to play</h2>
        <span className="meta">{stage ? `filter · ${stage}` : '6 stages · click to filter'}</span>
      </div>
      <div className="pipeline" role="tablist" aria-label="Pipeline stages">
        {STAGES.map((p) => {
          const active = stage === p.id;
          const muted = stage && !active;
          const count = counts[p.id];
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`stage${active ? ' active' : ''}${muted ? ' muted' : ''}${count ? ' has-count' : ''}`}
              onClick={() => toggleStage(p.id)}
            >
              <span className="num">{p.n} · {p.d}</span>
              <span className="t">{p.t}</span>
              {count != null && <span className="stage-count" aria-label={`${count} items`}>{fmtCount(count)}</span>}
              <span className="arrow" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </>
  );
}
