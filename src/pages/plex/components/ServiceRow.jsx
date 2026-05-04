import { ICONS } from '../../../lib/icons.jsx';
import { SERVICE_STAGE, usePlexUI } from '../PlexContext.jsx';
import { Sparkline } from './Sparkline.jsx';

export function Mark({ id }) { return ICONS[id] ? ICONS[id].svg : null; }

export function StatCell({ label, value, loading, tone, spark, sparkColor }) {
  const showShimmer = loading && value == null;
  return (
    <div className={'plex-stat' + (loading ? ' loading' : '')}>
      <div className={'v ' + (tone || (value == null ? 'muted' : ''))}>
        {showShimmer
          ? <span className="skel" style={{ width: 28, height: 12, display: 'inline-block', borderRadius: 3 }} aria-hidden="true" />
          : (value == null ? '—' : (typeof value === 'number' ? value.toLocaleString() : value))}
      </div>
      <div className="l">
        <span>{label}</span>
        {spark && spark.length >= 2 && (
          <Sparkline values={spark} w={48} h={12} stroke={sparkColor || 'currentColor'} ariaLabel={`${label} trend`} />
        )}
      </div>
    </div>
  );
}

export function badge(state) {
  if (state === 'loading') return <span className="latency dim">loading…</span>;
  if (state === 'stale')   return <span className="latency dim">cached</span>;
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

export function ServiceRow({ icon, name, desc, port, url, statusBadge, stats, extras }) {
  const { stage } = usePlexUI();
  const myStage = SERVICE_STAGE[icon] || null;
  const dimmed = stage && myStage && stage !== myStage;
  const cls = 'row-stats c' + Math.min(Math.max(stats.length, 1), 5);
  return (
    <div className={'plex-row' + (dimmed ? ' dimmed' : '') + (stage && myStage === stage ? ' highlighted' : '')}>
      <a className="row-head" href={url} target="_blank" rel="noopener noreferrer">
        <div className="ico"><Mark id={icon} /></div>
        <div className="row-head-text">
          <div className="title">{name}</div>
          <div className="desc">{desc}</div>
        </div>
        <div className="meta">
          {extras}
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
