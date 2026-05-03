import Mark from './Mark.jsx';
import { fmtBytes } from '../../../lib/format.js';
import { scrubDot, snapDot, smartDot } from '../../../lib/nas-health.js';

export default function PoolCard({ pool, color, disks }) {
  const p = pool;
  const sm = smartDot(disks, p.name);
  const sc = scrubDot(p);
  const sn = snapDot(p);
  return (
    <div className="nas-card">
      <div className="h">
        <div className="ico"><Mark id="truenas" /></div>
        <span className="t">{p.name}</span>
        <span className="sub">{p.pct}%</span>
      </div>
      <div className="content">
        <div className="num" style={{ fontSize: 18 }}>{fmtBytes(p.total - p.used)}<small> free</small></div>
        <div className="nas-bar"><i style={{ width: `${p.pct}%`, background: color }} /></div>
        <div className="hint">
          {fmtBytes(p.used)} used ·{' '}
          {p.healthy ? <span className="status-up">healthy</span> : <span className="status-warn">{p.status}</span>}
        </div>
        <div className="pool-health" aria-label="pool health">
          <span className={`status-dot ${sm.cls}`} title={`SMART · ${sm.txt}`} /><span className="hk">SMART</span>
          <span className={`status-dot ${sc.cls}`} title={`Scrub · ${sc.txt}`} /><span className="hk">scrub</span>
          <span className={`status-dot ${sn.cls}`} title={`Snapshots · ${sn.txt}`} /><span className="hk">snap</span>
        </div>
      </div>
    </div>
  );
}
