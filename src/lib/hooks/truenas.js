import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

const TN_BASE = '/api/truenas/api/v2.0';
const tn = (path, init = {}) =>
  getJson(`${TN_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

export function tsMs(v) {
  if (!v) return null;
  if (typeof v === 'object' && v.$date) return Number(v.$date);
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

export function poolHealth(p) {
  // TrueNAS exposes scrub/resilver state under `pool.scan` (single object,
  // last completed action). Function values: SCRUB | RESILVER. State values:
  // FINISHED | CANCELED | SCANNING.
  const scan = p.scan || null;
  return {
    scrubFn: scan?.function || null,
    scrubState: scan?.state || null,
    scrubErrors: scan?.errors ?? null,
    scrubEnd: tsMs(scan?.end_time),
    scrubStart: tsMs(scan?.start_time),
  };
}

// Pure: extract last value + downsampled sparkline from a TrueNAS reporting series.
export function summarizeSeries(series, valueIdx, { transform = (v) => v, sparklineLen = 32 } = {}) {
  if (!series?.data?.length || valueIdx < 0) return { last: null, spark: [] };
  const values = series.data.map((row) => transform(row[valueIdx] ?? 0));
  const step = Math.max(1, Math.floor(values.length / sparklineLen));
  const spark = [];
  for (let i = 0; i < values.length; i += step) spark.push(values[i]);
  return { last: values.at(-1) ?? null, spark };
}

// Pure: reduce a flat snapshot list into the latest creation per pool.
export function latestSnapshotByPool(snapshots) {
  const out = {};
  if (!Array.isArray(snapshots)) return out;
  for (const s of snapshots) {
    const name = s?.name || s?.dataset || '';
    const pool = name.split('/')[0] || name.split('@')[0];
    const t = tsMs(s?.properties?.creation?.parsed)
      ?? tsMs(s?.properties?.creation?.value)
      ?? tsMs(s?.created)
      ?? tsMs(s?.creation);
    if (!pool || !t) continue;
    if (!out[pool] || t > out[pool]) out[pool] = t;
  }
  return out;
}

export function useTrueNAS({ poll = 30_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const sys = await tn('/system/info', { signal });
      const [pools, reporting, disks, snapshots] = await getJsonAll([
        `${TN_BASE}/pool`,
        `${TN_BASE}/reporting/get_data`,
        `${TN_BASE}/disk`,
        `${TN_BASE}/zfs/snapshot?limit=500`,
      ], { signal });
      // Reporting is a POST so getJsonAll doesn't fit — refetch:
      const reportingActual = await tn('/reporting/get_data', {
        signal,
        method: 'POST',
        body: JSON.stringify([
          { name: 'cpu' },
          { name: 'memory' },
          { name: 'interface', identifier: 'eno1' },
        ]),
      }).catch(() => null);

      // Disk temperatures — single batched call. Skip if no disks loaded.
      const diskNames = Array.isArray(disks)
        ? disks.map((d) => d.name).filter(Boolean)
        : [];
      const temps = diskNames.length
        ? await tn('/disk/temperatures', {
            signal,
            method: 'POST',
            body: JSON.stringify({ names: diskNames }),
          }).catch(() => ({}))
        : {};

      // CPU: idle column → busy %
      const cpuSeries = reportingActual?.[0];
      const cpuIdleIdx = cpuSeries?.legend?.indexOf('idle') ?? -1;
      const { last: cpuPct, spark: cpuSpark } = summarizeSeries(cpuSeries, cpuIdleIdx, {
        transform: (idle) => 100 - idle,
      });

      // Memory used
      const memSeries = reportingActual?.[1];
      const memUsedIdx = memSeries?.legend?.indexOf('used') ?? -1;
      const { last: memUsed, spark: memSpark } = summarizeSeries(memSeries, memUsedIdx);

      // Network — needs RX + TX from same series in lock-step.
      const netSeries = reportingActual?.[2];
      let rx = 0, tx = 0, rxSpark = [], txSpark = [];
      if (netSeries?.data?.length) {
        const rxI = netSeries.legend.indexOf('received');
        const txI = netSeries.legend.indexOf('sent');
        for (const row of netSeries.data) {
          rxSpark.push(row[rxI] ?? 0);
          txSpark.push(row[txI] ?? 0);
        }
        const last = netSeries.data.at(-1);
        rx = last[rxI] ?? 0;
        tx = last[txI] ?? 0;
      }

      const diskList = Array.isArray(disks) ? disks.map((d) => ({
        name: d.name,
        model: d.model,
        type: d.type,
        size: +d.size || 0,
        pool: d.pool || null,
        temp: temps?.[d.name] ?? null,
        critical: d.critical ?? null,
      })) : [];
      const diskTemps = diskList.map((d) => d.temp).filter((t) => typeof t === 'number');
      const maxTemp = diskTemps.length ? Math.max(...diskTemps) : null;
      const hotDisks = diskList.filter((d) => d.temp != null && d.temp >= 50);
      const latestSnapByPool = latestSnapshotByPool(snapshots);

      return {
        system: sys,
        cpuPct: cpuPct != null ? Math.round(cpuPct) : null,
        cpuSpark,
        memUsed,
        memSpark,
        memTotal: sys.physmem,
        netRx: rx, netTx: tx,
        rxSpark: rxSpark.slice(-32), txSpark: txSpark.slice(-32),
        uptime: sys.uptime_seconds,
        pools: (pools || []).map((p) => ({
          name: p.name,
          healthy: p.healthy,
          status: p.status,
          used: +p.allocated || 0,
          total: +p.size || 0,
          pct: p.size ? Math.round(((+p.allocated || 0) / (+p.size)) * 100) : 0,
          topology: p.topology,
          ...poolHealth(p),
          latestSnap: latestSnapByPool[p.name] ?? null,
        })),
        disks: diskList,
        maxDiskTemp: maxTemp,
        hotDisks,
      };
    },
    { poll, cacheKey: 'true-nas'}
  );
  return { data, state };
}
