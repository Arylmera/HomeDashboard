import { fmtBytes, pct } from '../../../lib/format.js';
import Spark from './Spark.jsx';

export default function NASPanel({ nas, state }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// 06</span> NAS</div>
        <div className="panel-meta">
          {state === "live"
            ? <a href="nas.html">open NAS →</a>
            : state === "error"
              ? <span style={{ color: "var(--status-down)" }}>offline / cors</span>
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
          <div className="bar" style={{ marginTop: 6, height: 4, background: "oklch(1 0 0 / .04)", borderRadius: 2, overflow: "hidden" }}>
            <i style={{ display: "block", height: "100%", width: `${pct(nas?.memUsed, nas?.memTotal)}%`, background: "var(--steel)" }} />
          </div>
        </div>
      </div>
      {nas?.pools?.length ? nas.pools.map(p => (
        <div className="pool-row" key={p.name}>
          <div className="top">
            <div className="name">
              <span className={`dot ${p.healthy ? "up" : "warn"}`} />
              {p.name}
            </div>
            <div className="pct">{p.pct}%</div>
          </div>
          <div className="bar"><i className={p.pct > 90 ? "crit" : p.pct > 75 ? "warn" : ""} style={{ width: `${p.pct}%` }} /></div>
          <div className="meta">{fmtBytes(p.used)} <b>used</b> · {fmtBytes(p.total - p.used)} <b>free</b></div>
        </div>
      )) : <div className="empty">no pools — set VITE_TRUENAS_URL + TRUENAS_API_KEY in .env, then restart dev server</div>}
    </div>
  );
}
