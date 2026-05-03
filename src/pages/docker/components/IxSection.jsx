import { useState } from 'react';
import Stack from './Stack.jsx';

export default function IxSection({ stacks, baseIdx, onAction, onProjectAction }) {
  const [open, setOpen] = useState(false);
  const ixUp = stacks.reduce((n, s) => n + s.services.filter(c => c.state === 'running').length, 0);
  const ixTot = stacks.reduce((n, s) => n + s.services.length, 0);
  const allUp = ixUp === ixTot;

  return (
    <section className={'section ix-section' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="ix-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={`status-dot ${allUp ? 'up' : ixUp === 0 ? 'down' : 'warn'}`} />
        <span className="ix-toggle-numeral">// {String(baseIdx + 1).padStart(2, '0')}</span>
        <span className="ix-toggle-title">truenas apps</span>
        <span className="ix-toggle-badge">{stacks.length} stacks</span>
        <span className="ix-toggle-meta">{ixUp}/{ixTot} up · managed by ix</span>
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
