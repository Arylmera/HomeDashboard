import { useState } from 'react';
import ContainerCard from './ContainerCard.jsx';
import Dot from './Dot.jsx';
import { stackHue, stackHealth } from '../utils.js';

export default function Stack({ project, services, idx, onAction, onProjectAction, defaultOpen, readOnly: readOnlyProp }) {
  const variant = project?.name?.startsWith('ix-') ? 'ix' : null;
  const readOnly = readOnlyProp || variant === 'ix';
  const health = stackHealth(services, variant);
  const allUp = health.status === 'up';
  // healthy stacks collapse by default; degraded/down expand
  const [open, setOpen] = useState(defaultOpen ?? !allUp);
  const [busy, setBusy] = useState(false);
  const hue = stackHue(project?.name || '');
  const stoppedCount = services.length - health.up;

  const fire = async (action) => {
    if (!project?.id) return;
    setBusy(true);
    try { await onProjectAction(project.id, action); } finally { setBusy(false); }
  };

  const startStopped = async () => {
    setBusy(true);
    try {
      const stopped = services.filter(s => s.state !== 'running');
      await Promise.allSettled(stopped.map(s => onAction('containers', s.id, 'start')));
    } finally { setBusy(false); }
  };

  const sectionId = `stack-${(project?.name || 'loose').replace(/[^a-z0-9]+/gi, '-')}`;
  const headStateClass = allUp ? 'is-up' : health.status === 'down' ? 'is-down' : 'is-degraded';

  return (
    <section
      id={sectionId}
      className={'section docker-stack' + (open ? ' is-open' : '') + ' ' + headStateClass}
      style={{ '--stack-hue': hue }}
    >
      <div
        className="docker-stack-row"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); setOpen(o => !o);
          }
        }}
      >
        <span className="docker-stack-stripe" aria-hidden="true" />
        <span className="numeral">// {String(idx + 1).padStart(2, '0')}</span>
        <span className="docker-stack-name">{project?.name || '(loose)'}</span>
        <span className={`docker-stack-pill ${headStateClass}`}>
          {health.up}/{health.total}
        </span>
        <span className="docker-stack-dots" aria-hidden="true">
          {services.slice(0, 24).map(s => (
            <Dot key={s.id} s={s.state} />
          ))}
          {services.length > 24 && <span className="docker-stack-dots-more">+{services.length - 24}</span>}
        </span>
        <span className="docker-stack-spacer" />
        {readOnly && (
          <span className="section-meta-tag" title="managed by TrueNAS — control from the TrueNAS UI">read-only</span>
        )}
        {!readOnly && project?.id && (
          <span className="stack-actions" onClick={(e) => e.stopPropagation()}>
            {stoppedCount > 0 && stoppedCount < services.length && (
              <button disabled={busy} onClick={startStopped} title={`start ${stoppedCount} stopped`}>
                start {stoppedCount}
              </button>
            )}
            <button disabled={busy}
                    onClick={() => { if (window.confirm(`Redeploy stack ${project.name}? This recreates every container in the project.`)) fire('redeploy'); }}
                    title="redeploy">redeploy</button>
            {allUp
              ? <button disabled={busy}
                        onClick={() => { if (window.confirm(`Stop stack ${project.name}? This brings every container in the project down.`)) fire('down'); }}>stop</button>
              : <button disabled={busy} onClick={() => fire('up')}>start</button>}
          </span>
        )}
        <svg className="docker-stack-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div className="docker-grid">
          {services.map(c => (
            <ContainerCard key={c.id} c={c} onAction={onAction} readOnly={readOnly} />
          ))}
        </div>
      )}
    </section>
  );
}
