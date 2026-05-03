import { useState } from 'react';
import Dot from './Dot.jsx';
import { groupedPorts, shortName, serviceOf, uptimeOf } from '../utils.js';

export default function ContainerCard({ c, onAction, readOnly }) {
  const [busy, setBusy] = useState(false);
  const ports = groupedPorts(c.ports);
  const running = c.state === 'running';
  const name = shortName(c);
  const svc = serviceOf(c);

  const fire = async (action) => {
    setBusy(true);
    try { await onAction('containers', c.id, action); }
    finally { setBusy(false); }
  };

  return (
    <div className={'docker-card' + (running ? '' : ' is-down') + (busy ? ' is-busy' : '')}>
      <div className="docker-card-head">
        <Dot s={c.state} />
        <div className="docker-card-name" title={name}>{svc || name}</div>
      </div>
      <div className="docker-card-sub">
        <span className="docker-card-up">{uptimeOf(c)}</span>
        <span className="docker-card-img" title={c.image}>{c.image}</span>
      </div>
      {ports.length > 0 && (
        <div className="docker-card-ports">
          {ports.slice(0, 3).map((p, i) => (
            <span key={i} className="port-chip" title={`${p.label} → ${p.target}${p.count > 1 ? ` (${p.count})` : ''}`}>
              {p.label}<span className="arrow">↦</span>{p.target}
            </span>
          ))}
          {ports.length > 3 && <span className="port-chip more">+{ports.length - 3}</span>}
        </div>
      )}
      {!readOnly && (
        <div className="docker-card-actions">
          {running ? (
            <>
              <button onClick={() => { if (window.confirm(`Restart ${c.name}?`)) fire('restart'); }} disabled={busy} title="restart" aria-label={`restart ${c.name}`}>↻</button>
              <button onClick={() => { if (window.confirm(`Stop ${c.name}?`)) fire('stop'); }} disabled={busy} title="stop" aria-label={`stop ${c.name}`}>■</button>
            </>
          ) : (
            <button onClick={() => fire('start')} disabled={busy} title="start" aria-label={`start ${c.name}`}>▶</button>
          )}
        </div>
      )}
    </div>
  );
}
