import { useState } from 'react';
import Dot from './Dot.jsx';
import { uniqPorts, shortName, serviceOf, uptimeOf } from '../utils.js';

export default function ContainerCard({ c, onAction }) {
  const [busy, setBusy] = useState(false);
  const ports = uniqPorts(c.ports);
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
        <div className="docker-card-up">{uptimeOf(c)}</div>
      </div>
      <div className="docker-card-img" title={c.image}>{c.image}</div>
      {ports.length > 0 && (
        <div className="docker-card-ports">
          {ports.slice(0, 4).map((p, i) => (
            <span key={i} className="port-chip">{p.publicPort}<span className="arrow">↦</span>{p.privatePort}</span>
          ))}
          {ports.length > 4 && <span className="port-chip more">+{ports.length - 4}</span>}
        </div>
      )}
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
    </div>
  );
}
