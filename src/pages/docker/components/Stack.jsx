import { useState } from 'react';
import ContainerCard from './ContainerCard.jsx';

export default function Stack({ project, services, idx, onAction, onProjectAction }) {
  const [busy, setBusy] = useState(false);
  const total = services.length;
  const running = services.filter(s => s.state === 'running').length;
  const allUp = running === total;

  const fire = async (action) => {
    if (!project?.id) return;
    setBusy(true);
    try { await onProjectAction(project.id, action); } finally { setBusy(false); }
  };

  return (
    <section className="section docker-stack">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx + 1).padStart(2, '0')}</span>
          <h2>{project?.name || '(loose)'}</h2>
          <span className={`status-dot ${allUp ? 'up' : running === 0 ? 'down' : 'warn'}`} title={`${running}/${total} up`} />
        </div>
        <div className="section-meta">
          <span>{running}/{total} up</span>
          {project?.id && (
            <span className="stack-actions">
              <button disabled={busy}
                      onClick={() => { if (window.confirm(`Redeploy stack ${project.name}? This recreates every container in the project.`)) fire('redeploy'); }}
                      title="redeploy">redeploy</button>
              {allUp
                ? <button disabled={busy}
                          onClick={() => { if (window.confirm(`Stop stack ${project.name}? This brings every container in the project down.`)) fire('down'); }}>stop</button>
                : <button disabled={busy} onClick={() => fire('up')}>start</button>}
            </span>
          )}
        </div>
      </div>
      <div className="docker-grid">
        {services.map(c => (
          <ContainerCard key={c.id} c={c} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
