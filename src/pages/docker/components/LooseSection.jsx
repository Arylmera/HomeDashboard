import { useState } from 'react';
import ContainerCard from './ContainerCard.jsx';
import Dot from './Dot.jsx';

export default function LooseSection({ containers, idx, onAction, readOnly }) {
  const up = containers.filter(c => c.state === 'running').length;
  const total = containers.length;
  const allUp = up === total;
  const [open, setOpen] = useState(!allUp);
  const headStateClass = allUp ? 'is-up' : up === 0 ? 'is-down' : 'is-degraded';

  return (
    <section
      id="stack-loose"
      className={'section docker-stack ' + headStateClass + (open ? ' is-open' : '')}
      style={{ '--stack-hue': 0 }}
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
        <span className="numeral">// {String(idx).padStart(2, '0')}</span>
        <span className="docker-stack-name">loose containers</span>
        <span className={`docker-stack-pill ${headStateClass}`}>{up}/{total}</span>
        <span className="docker-stack-dots" aria-hidden="true">
          {containers.slice(0, 24).map(c => <Dot key={c.id} s={c.state} />)}
          {containers.length > 24 && <span className="docker-stack-dots-more">+{containers.length - 24}</span>}
        </span>
        <span className="docker-stack-spacer" />
        <span className="section-meta-tag">unmanaged</span>
        <svg className="docker-stack-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div className="docker-grid">
          {containers.map(c => (
            <ContainerCard key={c.id} c={c} onAction={onAction} readOnly={readOnly} />
          ))}
        </div>
      )}
    </section>
  );
}
