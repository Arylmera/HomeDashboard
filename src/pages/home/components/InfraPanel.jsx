import { fmtBytes, fmtRate, fmtNum, pct } from '../../../lib/format.js';
import { scrubDot, snapDot, smartDot } from '../../../lib/nas-health.js';
import Spark from './Spark.jsx';

export default function InfraPanel({ nas, state, pi, st, wan }) {
  const pools = nas?.pools || [];
  const totalCap = pools.reduce((s, p) => s + (p.total || 0), 0);
  const totalUsed = pools.reduce((s, p) => s + (p.used || 0), 0);
  const totalFree = totalCap - totalUsed;
  const usedPct = totalCap ? Math.round((totalUsed / totalCap) * 100) : 0;
  const memPct = pct(nas?.memUsed, nas?.memTotal);

  return (
    <div className="panel infra-panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// 05</span> Infrastructure</div>
        <div className="panel-meta" role="status" aria-live="polite">
          <span className="meta-pill">live · 30s</span>
          {state === "live"
            ? <a href="nas.html">open NAS →</a>
            : state === "error"
              ? <span className="meta-err">NAS offline</span>
              : <span>loading</span>}
        </div>
      </div>

      <div className="infra-grid">
        <div className="kpi-card" style={{ "--accent": "var(--ember)" }}>
          <div className="lbl">CPU</div>
          <div className="val">{nas?.cpuPct != null ? `${nas.cpuPct}%` : "—"}</div>
          <Spark data={nas?.cpuSpark || []} color="var(--ember)" />
        </div>

        <div className="kpi-card" style={{ "--accent": "var(--steel)" }}>
          <div className="lbl">Memory</div>
          <div className="val">{fmtBytes(nas?.memUsed)}</div>
          <div className="sub">of <b>{fmtBytes(nas?.memTotal)}</b></div>
          <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={memPct}
               aria-label={`Memory used: ${memPct} percent`}>
            <i style={{ width: `${memPct}%` }} />
          </div>
        </div>

        <div className="kpi-card" style={{ "--accent": "var(--sage)" }}>
          <div className="lbl">Storage</div>
          <div className="val">{totalCap ? fmtBytes(totalFree) : "—"}</div>
          <div className="sub">free · <b>{pools.length}</b> pool{pools.length === 1 ? '' : 's'}</div>
          <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={usedPct}
               aria-label={`Total storage used: ${usedPct} percent`}>
            <i className={usedPct > 90 ? "crit" : usedPct > 75 ? "warn" : ""} style={{ width: `${usedPct}%` }} />
          </div>
        </div>

        <div className="kpi-card" style={{ "--accent": "var(--ember)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            Throughput
          </div>
          <div className="val">↓ {fmtRate(nas?.netRx)}</div>
          <Spark data={nas?.rxSpark || []} color="var(--ember)" />
          <div className="sub">↑ <b>{fmtRate(nas?.netTx)}</b> · eno1</div>
        </div>

        <div className="kpi-card" style={{ "--accent": "var(--steel)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z M3 12h18 M12 3a14 14 0 0 1 0 18" /></svg>
            DNS · Pi-hole
          </div>
          <div className="val">{fmtNum(pi?.queries)}</div>
          <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pi?.pct ?? 0} aria-label="DNS queries blocked"><i style={{ width: `${pi?.pct ?? 0}%` }} /></div>
          <div className="sub"><b>{pi?.pct != null ? pi.pct.toFixed(1) : "—"}%</b> blocked · <b>{fmtNum(pi?.clients)}</b> clients</div>
        </div>

        <div className="kpi-card" style={{ "--accent": "var(--sage)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 12l4-4 M12 7v0" /></svg>
            ISP · Speedtest
            {wan?.state === 'live' && (
              <span
                className={`status-dot ${wan.up ? 'up' : 'down'}`}
                style={{ marginLeft: 6 }}
                title={wan.up
                  ? `WAN up · ${wan.latencyMs ?? '—'} ms · ${wan.target || ''}`
                  : 'WAN sentinel: both probes failed'}
              />
            )}
          </div>
          <div className="val">{st?.down != null ? `↓ ${Math.round(st.down)}` : "—"}<small className="unit">Mbps</small></div>
          <div className="sub">↑ <b>{st?.up != null ? Math.round(st.up) : "—"}</b> Mbps · <b>{st?.ping != null ? Math.round(st.ping) : "—"}</b> ms{wan?.state === 'live' && wan.up && wan.latencyMs != null && <> · WAN <b>{wan.latencyMs}</b> ms</>}</div>
        </div>
      </div>

      {pools.length ? (
        <div className="pools-strip">
          {pools.map(p => (
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
              <div className="meta">{fmtBytes(p.total - p.used)} <b>free</b> · {fmtBytes(p.total)} total</div>
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
          ))}
        </div>
      ) : null}
    </div>
  );
}
