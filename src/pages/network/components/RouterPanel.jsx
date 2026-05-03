import { useAsus, useAsusNode } from '../../../lib/hooks/asus.js';
import { fmtUptime, fmtKb } from '../utils.js';

const ASUS_URL = (import.meta.env.VITE_ASUS_URL || '').replace(/\/+$/, '');

function RouterMetric({ label, value, unit, sub, pct, color }) {
  return (
    <div className="speed-metric router-metric">
      <div className="speed-metric-head">
        <span className="speed-metric-label">{label}</span>
        {sub && <span className="speed-metric-sub">{sub}</span>}
      </div>
      <div className="speed-metric-value">
        {value == null ? <span className="dim">—</span> : <span>{value}</span>}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {pct != null && (
        <div className="router-bar" aria-hidden="true">
          <div
            className="router-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

function NodeSubsection({ n }) {
  const live = n.state === 'live';
  const errored = n.state === 'error';
  const loading = n.state === 'loading';
  const memPct = n.mem?.pct;
  const upStr = fmtUptime(n.uptime?.seconds);
  return (
    <div className="router-subsection">
      <div className="router-subsection-head">
        <span className="router-subsection-title">aimesh node</span>
        <span className="section-meta">
          {loading && 'loading…'}
          {errored && 'unreachable'}
          {live && (
            <>
              {n.model || 'asus'}
              {n.firmware && <> · fw {n.firmware}</>}
              {upStr && <> · up {upStr}</>}
            </>
          )}
        </span>
      </div>
      {live && (
        <div className="speed-panel router-panel router-node">
          <RouterMetric label="cpu" value={n.cpu} unit="%" pct={n.cpu}
            color="oklch(0.78 0.14 220)"
            sub={n.uptime?.load ? `load ${n.uptime.load.join(' / ')}` : null} />
          <RouterMetric label="memory" value={memPct} unit="%" pct={memPct}
            color="oklch(0.78 0.14 150)"
            sub={n.mem ? `${fmtKb(n.mem.usedKb)} / ${fmtKb(n.mem.totalKb)}` : null} />
          <RouterMetric label="clients"
            value={n.clients?.online ?? null}
            unit={n.clients?.total ? `/ ${n.clients.total}` : null}
            sub={n.clients ? `${n.clients.wired ?? 0} wired · ${n.clients.wireless ?? 0} wifi` : null} />
        </div>
      )}
    </div>
  );
}

export default function RouterPanel({ idx }) {
  const r = useAsus({ poll: 15_000 });
  const node = useAsusNode({ poll: 15_000 });
  const loading = r.state === 'loading';
  const idle = r.state === 'idle';
  const errored = r.state === 'error';
  const live = r.state === 'live';

  const cpu = r.cpu;
  const memPct = r.mem?.pct;
  const memUsed = fmtKb(r.mem?.usedKb);
  const memTotal = fmtKb(r.mem?.totalKb);
  const upStr = fmtUptime(r.uptime?.seconds);
  const wanUp = r.wan?.up;

  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx).padStart(2, '0')}</span>
          <h2>router</h2>
        </div>
        <span className="section-meta">
          {loading && 'loading…'}
          {idle && 'not configured'}
          {errored && 'unreachable'}
          {live && (
            <>
              {r.model || 'asus'}
              {r.firmware && <> · fw {r.firmware}</>}
              {upStr && <> · up {upStr}</>}
            </>
          )}
        </span>
      </div>

      {idle && (
        <p className="net-empty">
          ASUS router not configured. Set VITE_ASUS_URL / ASUS_USERNAME / ASUS_PASSWORD in .env.
        </p>
      )}
      {errored && (
        <p className="net-empty">
          Router unreachable. Check VITE_ASUS_URL and credentials.
        </p>
      )}

      {live && (
        <div className="speed-panel router-panel">
          <RouterMetric
            label="wan"
            value={wanUp ? 'up' : 'down'}
            sub={r.wan?.type ? r.wan.type.toUpperCase() : null}
          />
          <RouterMetric
            label="public ip"
            value={r.wanIp || (r.wan?.ip || null)}
            sub={r.wan?.gateway ? `gw ${r.wan.gateway}` : null}
          />
          <RouterMetric
            label="cpu"
            value={cpu != null ? cpu : null}
            unit="%"
            pct={cpu}
            color="oklch(0.78 0.14 220)"
            sub={r.uptime?.load ? `load ${r.uptime.load.join(' / ')}` : null}
          />
          <RouterMetric
            label="memory"
            value={memPct != null ? memPct : null}
            unit="%"
            pct={memPct}
            color="oklch(0.78 0.14 150)"
            sub={memUsed && memTotal ? `${memUsed} / ${memTotal}` : null}
          />
          <RouterMetric
            label="clients"
            value={r.clients?.online ?? null}
            unit={r.clients?.total ? `/ ${r.clients.total}` : null}
            sub={r.clients ? `${r.clients.wired ?? 0} wired · ${r.clients.wireless ?? 0} wifi` : null}
          />
          <div className="speed-meta">
            <div><span className="k">model</span><span className="v">{r.model || '—'}</span></div>
            {r.firmware && <div><span className="k">firmware</span><span className="v">{r.firmware}</span></div>}
            {Array.isArray(r.mesh) && r.mesh.length > 1 && (
              <div>
                <span className="k">aimesh</span>
                <span className="v">
                  {r.mesh.filter(m => m.role === 're').map(m => (
                    <span key={m.mac} title={`${m.mac}${m.ip ? ` · ${m.ip}` : ''}`}>
                      {m.model || 'node'} {m.online ? '●' : '○'}
                    </span>
                  )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ' · ', el], [])}
                </span>
              </div>
            )}
            {ASUS_URL && (
              <a className="speed-open" href={ASUS_URL} target="_blank" rel="noreferrer">open router →</a>
            )}
          </div>
        </div>
      )}

      {node.state !== 'idle' && <NodeSubsection n={node} />}
    </section>
  );
}
