import { fmtBytes } from '../../../lib/format.js';

export default function DiskTable({ disks }) {
  return (
    <div className="disks">
      <div className="disk-row head">
        <span></span>
        <span>Mount</span>
        <span className="model">Device</span>
        <span className="size">Size</span>
        <span className="temp">Used</span>
        <span>Status</span>
      </div>
      {disks.length === 0 && (
        <div className="empty-state">
          No disk data. Set <code>VITE_GLANCES_URL</code> in <code>.env</code>.
        </div>
      )}
      {disks.map((d) => {
        const status = d.pct > 90 ? 'warn' : 'healthy';
        return (
          <div key={d.id} className="disk-row">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>/{d.id.slice(0, 2)}</span>
            <span>
              <div className="name">{d.mnt}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{d.fs_type}</div>
            </span>
            <span className="model" style={{ color: 'var(--ink-dim)' }}>{d.device}</span>
            <span className="size">{fmtBytes(d.size)}</span>
            <span className="temp" style={{ color: d.pct >= 80 ? 'var(--status-warn)' : 'var(--ink)' }}>{d.pct?.toFixed(0)}%</span>
            <span className={`s ${status}`}>
              <span className={`status-dot ${status === 'warn' ? 'warn' : 'up'}`} role="img" aria-label={status === 'warn' ? 'near full' : 'healthy'} />
              {status === 'warn' ? 'near full' : 'healthy'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
