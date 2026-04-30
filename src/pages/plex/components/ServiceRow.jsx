import { ICONS } from '../../../lib/icons.jsx';

export function Mark({ id }) { return ICONS[id] ? ICONS[id].svg : null; }

export function StatCell({ label, value, loading, tone }) {
  return (
    <div className={'plex-stat' + (loading ? ' loading' : '')}>
      <div className={'v ' + (tone || (value == null ? 'muted' : ''))}>
        {loading ? '…' : (value == null ? '—' : (typeof value === 'number' ? value.toLocaleString() : value))}
      </div>
      <div className="l">{label}</div>
    </div>
  );
}

export function badge(state) {
  if (state === 'loading') return <span className="latency dim">loading…</span>;
  if (state === 'error')   return <span className="latency warn">error</span>;
  if (state === 'live')    return <span className="latency">live</span>;
  return <span className="latency dim">not configured</span>;
}

export function libCount(libs, type) {
  if (!libs) return null;
  const filtered = libs.filter(d => d.type === type);
  if (!filtered.length) return null;
  return filtered.reduce((a, d) => a + (+d.count || 0), 0);
}

export function ServiceRow({ icon, name, desc, port, url, statusBadge, stats }) {
  const cls = 'row-stats c' + Math.min(Math.max(stats.length, 2), 5);
  return (
    <div className="plex-row">
      <a className="row-head" href={url} target="_blank" rel="noopener noreferrer">
        <div className="ico"><Mark id={icon} /></div>
        <div>
          <div className="title">{name}</div>
          <div className="desc">{desc}</div>
        </div>
        <div className="meta">
          <span className="port">:{port}</span>
          {statusBadge}
        </div>
      </a>
      <div className={cls}>
        {stats.map(s => <StatCell key={s.label} {...s} />)}
      </div>
    </div>
  );
}
