export default function IssuesJump({ issues }) {
  if (!issues || issues.length === 0) return null;

  const jump = (key) => {
    const id = key.startsWith('stack-') ? key : 'stack-loose';
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="issues-jump" role="region" aria-label="container issues">
      <div className="issues-jump-head">
        <span className="status-dot down" aria-hidden="true" />
        <b>Issues ({issues.length})</b>
        <span className="issues-jump-hint">jump to:</span>
      </div>
      <div className="issues-jump-chips">
        {issues.slice(0, 8).map(i => (
          <button
            key={i.key}
            type="button"
            className={`issues-chip is-${i.status}`}
            onClick={() => jump(i.kind === 'stack' ? `stack-${i.name.replace(/[^a-z0-9]+/gi, '-')}` : 'loose')}
            title={`${i.name} · ${i.summary}`}
          >
            <span className="issues-chip-name">{i.name}</span>
            <span className="issues-chip-meta">{i.summary}</span>
          </button>
        ))}
        {issues.length > 8 && <span className="issues-chip is-more">+{issues.length - 8} more</span>}
      </div>
    </div>
  );
}
