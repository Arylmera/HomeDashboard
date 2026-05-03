import Mark from './Mark.jsx';
import Sparkline from './Sparkline.jsx';
import { fmtBytes, fmtRate } from '../../../lib/format.js';
import { fmtUptime } from '../utils.js';

export default function SystemOverview({
  tnState, host,
  cpuPct, percpu, avgTemp, avgTempHistory,
  memUsed, memTotal, memHistory,
  netRx, netTx, networkTotal, rxHistory,
}) {
  return (
    <>
      <div className="nas-section-title">
        <span className="numeral">01 · live</span>
        <h2>System overview</h2>
        <span className="meta">last 5 min · 5 s ticks</span>
      </div>
      <div className="nas-grid-4">
        <div className="nas-card">
          <div className="h">
            <div className="ico"><Mark id="truenas" /></div>
            <span className="t">TrueNAS</span>
            <span className="sub">{host.hostname || '—'}</span>
          </div>
          <div className="content">
            <div className="num">
              {tnState === 'error' ? <span className="status-down">Down</span>
               : tnState === 'live' ? <span className="status-up">Up</span>
               : <small>—</small>}
            </div>
            <div className="hint">uptime {fmtUptime(host.uptime_seconds)} · {host.version || '—'}</div>
          </div>
        </div>

        <div className="nas-card">
          <div className="h">
            <div className="ico"><Mark id="beszel" /></div>
            <span className="t">CPU</span>
            <span className="sub">{host.model ? `${host.cores}c` : '—'}</span>
          </div>
          <Sparkline
            seed={1}
            data={avgTempHistory}
            color="var(--ember)"
            domain={[30, 90]}
            format={(v) => `${Math.round(v)}°`}
          />
          <div className="content">
            <div className="num">
              {cpuPct != null ? <>{cpuPct}<small> %</small></> : <small>—</small>}
            </div>
            <div className="hint">
              {host.cores ? `${host.cores} cores` : (percpu.length ? `${percpu.length} cores` : '—')}
              {avgTemp != null && <> · avg {Math.round(avgTemp)} °C</>}
            </div>
          </div>
        </div>

        <div className="nas-card">
          <div className="h">
            <div className="ico"><Mark id="glances" /></div>
            <span className="t">Memory</span>
            <span className="sub">{memTotal ? fmtBytes(memTotal) : '—'}</span>
          </div>
          <Sparkline
            seed={2}
            data={memHistory}
            color="oklch(0.78 0.13 280)"
            domain={memTotal ? [0, memTotal] : null}
            format={fmtBytes}
          />
          <div className="content">
            <div className="num">
              {memUsed != null ? <>{(memUsed / 1024 / 1024 / 1024).toFixed(1)}<small> GiB</small></> : <small>—</small>}
            </div>
            <div className="hint">
              {memTotal ? `${fmtBytes(memTotal - (memUsed || 0))} free` : '—'}
              {memUsed != null && memTotal ? <> · {Math.round((memUsed / memTotal) * 100)}%</> : null}
            </div>
          </div>
        </div>

        <div className="nas-card">
          <div className="h">
            <div className="ico"><Mark id="speedtest" /></div>
            <span className="t">Network</span>
            <span className="sub">eno1</span>
          </div>
          <Sparkline
            seed={3}
            data={rxHistory}
            color="oklch(0.74 0.15 145)"
            format={fmtRate}
          />
          <div className="content">
            <div className="num">
              <span className="dual">
                <span><small style={{ marginRight: 4 }}>↓</small>{netRx != null ? fmtRate(netRx) : '—'}</span>
                <span><small style={{ marginRight: 4 }}>↑</small>{netTx != null ? fmtRate(netTx) : '—'}</span>
              </span>
            </div>
            <div className="hint">{networkTotal?.interface_name || 'eno1'} · {networkTotal ? `${fmtBytes(networkTotal.bytes_recv)} rx total` : '—'}</div>
          </div>
        </div>
      </div>
    </>
  );
}
