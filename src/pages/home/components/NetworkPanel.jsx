import { fmtRate, fmtNum } from '../../../lib/format.js';
import Spark from './Spark.jsx';

export default function NetworkPanel({ nas, pi, st, wan }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// 05</span> Network</div>
        <div className="panel-meta">live · 30s</div>
      </div>
      <div className="net-grid">
        <div className="net-card" style={{ "--accent": "var(--ember)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            Throughput
          </div>
          <div className="val">↓ {fmtRate(nas?.netRx)}</div>
          <Spark data={nas?.rxSpark || []} color="var(--ember)" />
          <div className="sub">↑ <b>{fmtRate(nas?.netTx)}</b> · eno1</div>
        </div>
        <div className="net-card" style={{ "--accent": "var(--steel)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z M3 12h18 M12 3a14 14 0 0 1 0 18" /></svg>
            DNS · Pi-hole
          </div>
          <div className="val">{fmtNum(pi?.queries)}</div>
          <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pi?.pct ?? 0} aria-label="DNS queries blocked"><i style={{ width: `${pi?.pct ?? 0}%` }} /></div>
          <div className="sub"><b>{pi?.pct != null ? pi.pct.toFixed(1) : "—"}%</b> blocked · <b>{fmtNum(pi?.clients)}</b> clients</div>
        </div>
        <div className="net-card" style={{ "--accent": "var(--sage)" }}>
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
    </div>
  );
}
