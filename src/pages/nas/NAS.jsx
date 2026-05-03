/* ============================================================== *
 *  NAS — TrueNAS-driven storage dashboard.
 *  Page shell: hero + section orchestration.
 *  Cards/panels live in ./components, history hook in
 *  ./useNasHistory.js, helpers in ./utils.js.
 * ============================================================== */
import { useMemo } from 'react';
import { fmtBytes } from '../../lib/format.js';
import { useTrueNAS, useGlances } from '../../lib/hooks.js';
import { POOL_COLORS } from './utils.js';
import useNasHistory from './useNasHistory.js';
import SystemOverview from './components/SystemOverview.jsx';
import PoolCard from './components/PoolCard.jsx';
import CoreOverlay from './components/CoreOverlay.jsx';
import DiskTable from './components/DiskTable.jsx';

export default function NAS() {
  const { data: tn, state: tnState } = useTrueNAS();
  const { data: glances } = useGlances();

  const host = tn?.system || {};
  const pools = tn?.pools || [];

  // CPU + memory: Glances primary.
  const cpuPct = glances?.cpu?.total != null
    ? Math.round(glances.cpu.total)
    : (glances?.cpu?.idle != null ? Math.round(100 - glances.cpu.idle) : null);
  const memUsed = glances?.mem?.used ?? null;
  const memTotal = glances?.mem?.total ?? null;

  // Per-core temps + usage.
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
      out.push({ i, temp: tempEntry?.value ?? null, usage });
    }
    return out;
  }, [host.cores, percpu, sensors]);

  // Disks via Glances fs.
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

  const { tempHistory, usageHistory, avgTempHistory, memHistory, rxHistory } = useNasHistory({
    cores, memUsed, netRx, netTx,
  });
  const avgTemp = avgTempHistory.length ? avgTempHistory[avgTempHistory.length - 1] : null;

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
        {tnState === 'error'
          ? <>Cannot reach TrueNAS via <code>/api/truenas</code>. Check <code>VITE_TRUENAS_URL</code> and <code>TRUENAS_API_KEY</code> in <code>.env</code>, then restart the dev server.</>
          : tnState === 'loading'
            ? <>Connecting to TrueNAS…</>
            : <>Live from <code>{host.hostname || 'TrueNAS'}</code> · {host.cores ? `${host.cores}c` : '—'} · {fmtBytes(host.physmem)} RAM · {pools.length} pools · {disks.length} disks. Auto-refresh every 30s.</>
        }
      </p>

      <SystemOverview
        tnState={tnState}
        host={host}
        cpuPct={cpuPct}
        percpu={percpu}
        avgTemp={avgTemp}
        avgTempHistory={avgTempHistory}
        memUsed={memUsed}
        memTotal={memTotal}
        memHistory={memHistory}
        netRx={netRx}
        netTx={netTx}
        networkTotal={networkTotal}
        rxHistory={rxHistory}
      />

      <div className="nas-section-title">
        <span className="numeral">02 · pools</span>
        <h2>ZFS storage</h2>
        <span className="meta">{pools.length} pools · {fmtBytes(pools.reduce((s, p) => s + (p.total || 0), 0))} raw</span>
      </div>
      <div className="nas-grid-4">
        {pools.length === 0 && tnState !== 'loading' ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            No pools detected. Set <code>VITE_TRUENAS_URL</code> and <code>TRUENAS_API_KEY</code> in <code>.env</code>.
          </div>
        ) : pools.map((p, i) => (
          <PoolCard
            key={p.name}
            pool={p}
            color={POOL_COLORS[i % POOL_COLORS.length]}
            disks={tn?.disks}
          />
        ))}
      </div>

      <div className="nas-section-title">
        <span className="numeral">03 · silicon</span>
        <h2>CPU cores</h2>
        <span className="meta">warn 82 °C · crit 100 °C</span>
      </div>
      <CoreOverlay
        cores={cores}
        tempHistory={tempHistory}
        usageHistory={usageHistory}
      />

      <div className="nas-section-title">
        <span className="numeral">04 · disks</span>
        <h2>Filesystems</h2>
        <span className="meta">{disks.length} mounts · via Glances</span>
      </div>
      <DiskTable disks={disks} />

      <div className="footnote">
        TrueNAS SCALE · live via <code>/api/truenas/api/v2.0</code> · refresh 30s · {tnState === 'error' ? <span className="status-down">connection error. check .env and dev server.</span> : 'connected'}
      </div>
    </div>
  );
}
