import { useState } from 'react';
import Stack from './Stack.jsx';

export default function IxSection({ stacks, baseIdx, onAction, onProjectAction }) {
  const ixUp = stacks.reduce((n, s) => n + s.services.filter(c => c.state === 'running').length, 0);
  const ixTot = stacks.reduce((n, s) => n + s.services.length, 0);
  // ix variant: a stack is "healthy" as long as ANY container is running
  // (TrueNAS bundles main + sidecars/init helpers that idle by design).
  const stacksUp = stacks.filter(s => s.services.some(c => c.state === 'running')).length;
  const allUp = stacksUp === stacks.length;
  // ix apps are managed externally — default the whole section closed even
  // when something is down. The rolled-up dot/pill in the header still surfaces
  // status; clicking opens the children for inspection.
  const [open, setOpen] = useState(false);
  const summary = `${stacksUp}/${stacks.length} apps up · ${ixUp}/${ixTot} containers · managed by ix`;

  return (
    <section className={'section ix-section' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="ix-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={`status-dot ${allUp ? 'up' : stacksUp === 0 ? 'down' : 'warn'}`} />
        <span className="ix-toggle-numeral">// {String(baseIdx + 1).padStart(2, '0')}</span>
        <span className="ix-toggle-title">truenas apps</span>
        <span className="ix-toggle-badge">{stacks.length} stacks</span>
        <span className="ix-toggle-meta">{summary}</span>
        <span className="ix-toggle-action">{open ? 'hide' : 'show'}</span>
        <svg className="ix-toggle-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="ix-children">
          {stacks.map((s, i) => (
            <Stack
              key={s.project.name}
              idx={baseIdx + i + 1}
              project={s.project}
              services={s.services}
              onAction={onAction}
              onProjectAction={onProjectAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
