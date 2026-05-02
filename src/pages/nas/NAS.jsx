/* ============================================================== *
 *  NAS — TrueNAS-driven storage dashboard.
 *  Sections: System overview · ZFS pools · CPU cores (Glances) · Disks
 * ============================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ICONS } from '../../lib/icons.jsx';
import { fmtBytes, fmtRate } from '../../lib/format.js';
import { useTrueNAS, useGlances } from '../../lib/hooks.js';

function Mark({ id }) { return ICONS[id] ? ICONS[id].svg : null; }

function fmtUptime(sec) {
  if (!sec) return "—";
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600);
  return `${d}d ${h}h`;
}

// Catmull-Rom → cubic Bézier (tension 0.5) for smooth curves through every sample.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function Sparkline({
  data,
  color = "var(--ember)",
  w = 260, h = 56,
  seed = 0,
  maxPoints = 60,            // 60 × 5 s = last 5 min
  domain = null,             // [min, max] fixed scale, or null = auto-fit
  pad = 0.08,                // headroom in auto mode
  format = (v) => Math.round(v),
  showLabels = true,
  showGrid = true,
  showTimeTicks = true,
  smooth = true,
  axisLabel = "5m",
}) {
  const tail = useMemo(() => (data && data.length ? data.slice(-maxPoints) : null), [data, maxPoints]);
  const scale = useMemo(() => {
    if (!tail || tail.length < 2) return null;
    let lo, hi;
    if (domain) { [lo, hi] = domain; }
    else {
      lo = Math.min(...tail); hi = Math.max(...tail);
      const span = (hi - lo) || Math.max(1, Math.abs(hi) * 0.1);
      lo -= span * pad; hi += span * pad;
    }
    const span = (hi - lo) || 1;
    return { lo, hi, span, vmin: Math.min(...tail), vmax: Math.max(...tail), last: tail[tail.length - 1] };
  }, [tail, domain, pad]);

  if (!tail || tail.length < 2 || !scale) return <svg className="nas-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;

  const padTop = 8, padBot = 10;
  const innerH = h - padTop - padBot;
  const stepX = w / (tail.length - 1);
  const yOf = (v) => padTop + innerH - ((v - scale.lo) / scale.span) * innerH;
  const pts = tail.map((v, i) => [i * stepX, yOf(v)]);
  const line = smooth ? smoothPath(pts) : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const gid = `g-${seed}`;
  const gridLevels = [0.25, 0.5, 0.75];
  const lastX = pts[pts.length - 1][0];
  const lastY = pts[pts.length - 1][1];

  return (
    <svg className="nas-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showGrid && gridLevels.map((g, i) => {
        const y = padTop + innerH * g;
        return <line key={i} x1="0" x2={w} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />;
      })}

      {showTimeTicks && (
        <>
          <line x1="0.5" x2="0.5" y1={padTop} y2={h - padBot} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
          <line x1={(w / 2).toFixed(1)} x2={(w / 2).toFixed(1)} y1={h - padBot - 2} y2={h - padBot + 1} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
          <line x1={(w - 0.5).toFixed(1)} x2={(w - 0.5).toFixed(1)} y1={padTop} y2={h - padBot} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
        </>
      )}

      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

      {/* dot at latest sample */}
      <circle cx={lastX} cy={lastY} r="2" fill={color} />

      {showLabels && (
        <g style={{ font: "9px var(--font-mono, ui-monospace)", fill: "currentColor", fillOpacity: 0.55 }}>
          <text x="3" y={padTop + 7}>max {format(scale.vmax)}</text>
          <text x="3" y={h - 2}>min {format(scale.vmin)}</text>
          <text x={w - 3} y={h - 2} textAnchor="end" fillOpacity="0.4">−{axisLabel}  ·  now</text>
        </g>
      )}
    </svg>
  );
}

const POOL_COLORS = [
  "oklch(0.73 0.14 50)", "oklch(0.78 0.13 80)",
  "oklch(0.73 0.14 200)", "oklch(0.73 0.14 300)", "oklch(0.74 0.15 145)",
];

export default function NAS() {
  const { data: tn, state: tnState } = useTrueNAS();
  const { data: glances } = useGlances();

  const host = tn?.system || {};
  const pools = tn?.pools || [];

  // CPU + memory: Glances as primary source
  const cpuPct = glances?.cpu?.total != null
    ? Math.round(glances.cpu.total)
    : (glances?.cpu?.idle != null ? Math.round(100 - glances.cpu.idle) : null);
  const memUsed = glances?.mem?.used ?? null;
  const memTotal = glances?.mem?.total ?? null;

  // Per-core temps + usage from Glances
  const sensors = glances?.sensors || [];
  const percpu = glances?.percpu || [];
  const cores = useMemo(() => {
    const expected = Math.min(8, host.cores || percpu.length || 0);
    const out = [];
    for (let i = 0; i < expected; i++) {
      const tempEntry = sensors.find(s => s.label === `Core ${i}` || s.label === `Package id ${i}` || s.label === `cpu${i}` || s.label === `Core${i}`);
      const cpu = percpu[i];
      const usage = cpu
        ? Math.round(cpu.total != null ? cpu.total : (cpu.idle != null ? 100 - cpu.idle : (cpu.user || 0) + (cpu.system || 0)))
        : null;
      out.push({
        i,
        temp: tempEntry?.value ?? null,
        usage,
      });
    }
    return out;
  }, [host.cores, percpu, sensors]);

  // Per-core temp history (ring buffer, 128 samples) for sparklines
  const HISTORY_MAX = 128;
  const [tempHistory, setTempHistory] = useState({});
  const [avgTempHistory, setAvgTempHistory] = useState([]);
  const lastTempStampRef = useRef(0);

  // Seed all history buffers from server-persisted samples on mount so
  // graphs render instantly instead of after several live ticks.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/metrics');
        if (!r.ok) return;
        const data = await r.json();
        if (!alive) return;
        const tail = (s) => (data[s] || []).slice(-HISTORY_MAX).map(([, v]) => v);
        const mem = tail('mem.used'), rx = tail('net.rx'), tx = tail('net.tx');
        const avg = tail('cpu.temp.avg');
        if (mem.length) setMemHistory(mem);
        if (rx.length)  setRxHistory(rx);
        if (tx.length)  setTxHistory(tx);
        if (avg.length) setAvgTempHistory(avg);
        const perCore = {};
        for (const k of Object.keys(data)) {
          const m = k.match(/^cpu\.temp\.(\d+)$/);
          if (m) perCore[+m[1]] = tail(k);
        }
        if (Object.keys(perCore).length) setTempHistory(perCore);
        // Don't suppress the next live tick — let it append normally.
      } catch {}
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!cores.length) return;
    const now = Date.now();
    if (now - lastTempStampRef.current < 5000) return;
    const temps = cores.map(c => c.temp).filter(t => t != null);
    if (!temps.length) return;
    lastTempStampRef.current = now;
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    setTempHistory(prev => {
      const next = { ...prev };
      cores.forEach(c => {
        if (c.temp == null) return;
        const arr = next[c.i] ? next[c.i].slice() : [];
        arr.push(c.temp);
        if (arr.length > HISTORY_MAX) arr.shift();
        next[c.i] = arr;
      });
      return next;
    });
    setAvgTempHistory(prev => {
      const arr = prev.slice();
      arr.push(avg);
      if (arr.length > HISTORY_MAX) arr.shift();
      return arr;
    });
  }, [cores]);
  const avgTemp = avgTempHistory.length ? avgTempHistory[avgTempHistory.length - 1] : null;

  // Disks from Glances fs (fallback if TrueNAS /disk not exposed via reporting)
  const disks = useMemo(() => {
    const fs = glances?.fs || [];
    return fs.filter(d => d.device_name && !d.device_name.startsWith('tmpfs')).map(d => ({
      id: d.device_name.replace(/^\//, '').replace(/\//g, '-'),
      device: d.device_name,
      mnt: d.mnt_point,
      size: d.size,
      used: d.used,
      pct: d.percent,
      fs_type: d.fs_type,
    }));
  }, [glances]);

  const networkTotal = (glances?.network || []).find(n => n.interface_name === 'eno1' || n.interface_name === 'eth0') || (glances?.network || [])[0];
  const netRx = networkTotal?.bytes_recv_rate_per_sec ?? networkTotal?.rx ?? null;
  const netTx = networkTotal?.bytes_sent_rate_per_sec ?? networkTotal?.tx ?? null;

  // Client-side ring buffers for memory load + network (fallback when /reporting unavailable)
  const [memHistory, setMemHistory] = useState([]);
  const [rxHistory, setRxHistory] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const lastSysStampRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastSysStampRef.current < 5000) return;
    if (memUsed == null && netRx == null && netTx == null) return;
    lastSysStampRef.current = now;
    if (memUsed != null) {
      setMemHistory(prev => {
        const arr = prev.slice(); arr.push(memUsed);
        if (arr.length > 128) arr.shift();
        return arr;
      });
    }
    if (netRx != null) {
      setRxHistory(prev => {
        const arr = prev.slice(); arr.push(netRx);
        if (arr.length > 128) arr.shift();
        return arr;
      });
    }
    if (netTx != null) {
      setTxHistory(prev => {
        const arr = prev.slice(); arr.push(netTx);
        if (arr.length > 128) arr.shift();
        return arr;
      });
    }
  }, [memUsed, netRx, netTx]);

  const memSparkData = memHistory;
  const rxSparkData = rxHistory;

  const lastTxt = tnState === "live" ? "live · 30s" : tnState === "error" ? "offline" : "connecting";
  const stateColor = tnState === "live" ? "var(--status-up)" : tnState === "error" ? "var(--status-down)" : "var(--status-warn)";

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 20 L12 4 L19 20" /><path d="M8.5 13 H15.5" />
            </svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">nas · hera</span></div>
        </div>
        <div className="topbar-right">
          <a className="nav-pill" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
            <span>home</span>
          </a>
        </div>
      </div>

      <div className="eyebrow">Storage & Compute</div>
      <h1 className="page-h1">The <em>vault.</em></h1>
      <p className="page-lede">
        {tnState === "error"
          ? <>Cannot reach TrueNAS via <code>/api/truenas</code>. Check <code>VITE_TRUENAS_URL</code> and <code>TRUENAS_API_KEY</code> in <code>.env</code>, then restart the dev server.</>
          : tnState === "loading"
            ? <>Connecting to TrueNAS…</>
            : <>Live from <code>{host.hostname || "TrueNAS"}</code> · {host.cores ? `${host.cores}c` : "—"} · {fmtBytes(host.physmem)} RAM · {pools.length} pools · {disks.length} disks. Auto-refresh every 30s.</>
        }
      </p>

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
            <span className="sub">{host.hostname || "—"}</span>
          </div>
          <div className="content">
            <div className="num">
              {tnState === "error" ? <span className="status-down">Down</span>
               : tnState === "live" ? <span className="status-up">Up</span>
               : <small>—</small>}
            </div>
            <div className="hint">uptime {fmtUptime(host.uptime_seconds)} · {host.version || "—"}</div>
          </div>
        </div>

        <div className="nas-card">
          <div className="h">
            <div className="ico"><Mark id="beszel" /></div>
            <span className="t">CPU</span>
            <span className="sub">{host.model ? `${host.cores}c` : "—"}</span>
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
              {host.cores ? `${host.cores} cores` : (percpu.length ? `${percpu.length} cores` : "—")}
              {avgTemp != null && <> · avg {Math.round(avgTemp)} °C</>}
            </div>
          </div>
        </div>

        <div className="nas-card">
          <div className="h">
            <div className="ico"><Mark id="glances" /></div>
            <span className="t">Memory</span>
            <span className="sub">{memTotal ? fmtBytes(memTotal) : "—"}</span>
          </div>
          <Sparkline
            seed={2}
            data={memSparkData}
            color="oklch(0.78 0.13 280)"
            domain={memTotal ? [0, memTotal] : null}
            format={fmtBytes}
          />
          <div className="content">
            <div className="num">
              {memUsed != null ? <>{(memUsed / 1024 / 1024 / 1024).toFixed(1)}<small> GiB</small></> : <small>—</small>}
            </div>
            <div className="hint">
              {memTotal ? `${fmtBytes(memTotal - (memUsed || 0))} free` : "—"}
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
            data={rxSparkData}
            color="oklch(0.74 0.15 145)"
            format={fmtRate}
          />
          <div className="content">
            <div className="num">
              <span className="dual">
                <span><small style={{ marginRight: 4 }}>↓</small>{netRx != null ? fmtRate(netRx) : "—"}</span>
                <span><small style={{ marginRight: 4 }}>↑</small>{netTx != null ? fmtRate(netTx) : "—"}</span>
              </span>
            </div>
            <div className="hint">{networkTotal?.interface_name || "eno1"} · {networkTotal ? `${fmtBytes(networkTotal.bytes_recv)} rx total` : "—"}</div>
          </div>
        </div>
      </div>

      <div className="nas-section-title">
        <span className="numeral">02 · pools</span>
        <h2>ZFS storage</h2>
        <span className="meta">{pools.length} pools · {fmtBytes(pools.reduce((s, p) => s + (p.total || 0), 0))} raw</span>
      </div>
      <div className="nas-grid-4">
        {pools.length === 0 && tnState !== "loading" ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            No pools detected. Set <code>VITE_TRUENAS_URL</code> and <code>TRUENAS_API_KEY</code> in <code>.env</code>.
          </div>
        ) : pools.map((p, i) => {
          const color = POOL_COLORS[i % POOL_COLORS.length];
          return (
            <div key={p.name} className="nas-card">
              <div className="h">
                <div className="ico"><Mark id="truenas" /></div>
                <span className="t">{p.name}</span>
                <span className="sub">{p.pct}%</span>
              </div>
              <div className="content">
                <div className="num" style={{ fontSize: 18 }}>{fmtBytes(p.total - p.used)}<small> free</small></div>
                <div className="nas-bar"><i style={{ width: `${p.pct}%`, background: color }} /></div>
                <div className="hint">{fmtBytes(p.used)} used · {p.healthy ? <span className="status-up">healthy</span> : <span className="status-warn">{p.status}</span>}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="nas-section-title">
        <span className="numeral">03 · silicon</span>
        <h2>CPU cores</h2>
        <span className="meta">warn 82 °C · crit 100 °C</span>
      </div>
      <div className="nas-grid-4">
        {cores.map((c) => {
          const hot = c.temp != null && c.temp >= 70;
          const warn = c.temp != null && c.temp >= 60;
          const color = hot ? "var(--status-down)" : warn ? "var(--status-warn)" : "var(--ember)";
          return (
            <div key={c.i} className="nas-card">
              <div className="h">
                <div className="ico"><Mark id="beszel" /></div>
                <span className="t">CPU {c.i}</span>
                <span className="sub">core</span>
              </div>
              <Sparkline
                seed={100 + c.i}
                data={tempHistory[c.i]}
                color={color}
                h={48}
                domain={[30, 90]}
                format={(v) => `${Math.round(v)}°`}
                showLabels={false}
                showTimeTicks={false}
              />
              <div className="content">
                <div className="num" style={{ color }}>
                  {c.temp != null ? <>{Math.round(c.temp)}<small> °C</small></> : <small>—</small>}
                </div>
                {c.usage != null && (
                  <div className="nas-bar"><i style={{ width: `${Math.min(100, Math.max(0, c.usage))}%`, background: color }} /></div>
                )}
                <div className="hint">
                  {c.usage != null ? `${c.usage}% load` : "no glances data"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="nas-section-title">
        <span className="numeral">04 · disks</span>
        <h2>Filesystems</h2>
        <span className="meta">{disks.length} mounts · via Glances</span>
      </div>
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
          const status = d.pct > 90 ? "warn" : "healthy";
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
                <span className={`status-dot ${status === "warn" ? "warn" : "up"}`} role="img" aria-label={status === "warn" ? "near full" : "healthy"} />
                {status === "warn" ? "near full" : "healthy"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="footnote">
        TrueNAS SCALE · live via <code>/api/truenas/api/v2.0</code> · refresh 30s · {tnState === "error" ? <span className="status-down">connection error. check .env and dev server.</span> : "connected"}
      </div>
    </div>
  );
}
