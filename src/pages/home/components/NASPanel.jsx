import { fmtBytes, pct } from '../../../lib/format.js';
import { scrubDot, snapDot, smartDot } from '../../../lib/nas-health.js';
import Spark from './Spark.jsx';

export default function NASPanel({ nas, state }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// 06</span> NAS</div>
        <div className="panel-meta" role="status" aria-live="polite">
          {state === "live"
            ? <a href="nas.html">open NAS →</a>
            : state === "error"
              ? <span className="meta-err">offline. cors blocked.</span>
              : "loading"}
        </div>
      </div>
      <div className="nas-grid">
        <div className="nas-stat">
          <div className="lbl">CPU</div>
          <div className="val">{nas?.cpuPct != null ? `${nas.cpuPct}%` : "—"}</div>
          <Spark data={nas?.cpuSpark || []} color="var(--ember)" />
        </div>
        <div className="nas-stat">
          <div className="lbl">Memory</div>
          <div className="val">{fmtBytes(nas?.memUsed)}</div>
          <div className="sub">of <b>{fmtBytes(nas?.memTotal)}</b></div>
          <div className="nas-stat-bar" role="progressbar"
               aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct(nas?.memUsed, nas?.memTotal)}
               aria-label={`Memory used: ${pct(nas?.memUsed, nas?.memTotal)} percent`}>
            <i style={{ width: `${pct(nas?.memUsed, nas?.memTotal)}%` }} />
          </div>
        </div>
      </div>
      {nas?.pools?.length ? nas.pools.map(p => (
        <div className="pool-row" key={p.name}>
          <div className="top">
            <div className="name">
              <span className={`status-dot ${p.healthy ? "up" : "warn"}`}
                    role="img" aria-label={p.healthy ? "pool healthy" : "pool degraded"} />
              {p.name}
            </div>
            <div className="pct">{p.pct}%</div>
          </div>
          <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={p.pct}
               aria-label={`${p.name} pool ${p.pct} percent full`}>
            <i className={p.pct > 90 ? "crit" : p.pct > 75 ? "warn" : ""} style={{ width: `${p.pct}%` }} />
          </div>
          <div className="meta">{fmtBytes(p.used)} <b>used</b> · {fmtBytes(p.total - p.used)} <b>free</b></div>
          <div className="pool-health" aria-label="pool health">
            {(() => {
              const sm = smartDot(nas?.disks, p.name);
              const sc = scrubDot(p);
              const sn = snapDot(p);
              return (
                <>
                  <span className={`status-dot ${sm.cls}`} title={`SMART · ${sm.txt}`} /><span className="hk">SMART</span>
                  <span className={`status-dot ${sc.cls}`} title={`Scrub · ${sc.txt}`} /><span className="hk">scrub</span>
                  <span className={`status-dot ${sn.cls}`} title={`Snapshots · ${sn.txt}`} /><span className="hk">snap</span>
                </>
              );
            })()}
          </div>
        </div>
      )) : <div className="empty">No pools detected. Set <code>VITE_TRUENAS_URL</code> and <code>TRUENAS_API_KEY</code> in <code>.env</code>, then restart the dev server.</div>}
    </div>
  );
}
