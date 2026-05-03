import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

const TN_BASE = "/api/truenas/api/v2.0";
async function tn(path, init = {}) {
  return getJson(`${TN_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

function tsMs(v) {
  if (!v) return null;
  if (typeof v === "object" && v.$date) return Number(v.$date);
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

function poolHealth(p) {
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

export function useTrueNAS({ poll = 30_000 } = {}) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [sys, pools, reporting, disks, snapshots] = await Promise.all([
          tn("/system/info"),
          tn("/pool"),
          tn("/reporting/get_data", {
            method: "POST",
            body: JSON.stringify([{ name: "cpu" }, { name: "memory" }, { name: "interface", identifier: "eno1" }]),
          }).catch(() => null),
          tn("/disk").catch(() => null),
          // Recent snapshots only — limit prevents fetching tens of thousands.
          tn("/zfs/snapshot?limit=500").catch(() => null),
        ]);
        if (!alive) return;

        // Disk temperatures — single batched call. Skip if no disks loaded.
        let temps = {};
        const diskNames = Array.isArray(disks)
          ? disks.map(d => d.name).filter(Boolean)
          : [];
        if (diskNames.length) {
          temps = await tn("/disk/temperatures", {
            method: "POST",
            body: JSON.stringify({ names: diskNames }),
          }).catch(() => ({}));
        }
        if (!alive) return;

        // Latest snapshot timestamp per pool (snapshot name: "pool/ds@snap").
        const latestSnapByPool = {};
        if (Array.isArray(snapshots)) {
          for (const s of snapshots) {
            const name = s?.name || s?.dataset || "";
            const pool = name.split("/")[0] || name.split("@")[0];
            const t = tsMs(s?.properties?.creation?.parsed)
              ?? tsMs(s?.properties?.creation?.value)
              ?? tsMs(s?.created)
              ?? tsMs(s?.creation);
            if (!pool || !t) continue;
            if (!latestSnapByPool[pool] || t > latestSnapByPool[pool]) {
              latestSnapByPool[pool] = t;
            }
          }
        }

        // CPU
        const cpuSeries = reporting?.[0];
        let cpuSpark = [], cpuPct = null;
        if (cpuSeries?.data?.length) {
          const idleIdx = cpuSeries.legend.indexOf("idle");
          const usage = cpuSeries.data.map(row => 100 - (row[idleIdx] ?? 0));
          const step = Math.max(1, Math.floor(usage.length / 32));
          for (let i = 0; i < usage.length; i += step) cpuSpark.push(usage[i]);
          cpuPct = Math.round(usage.at(-1));
        }
        // Memory
        const memSeries = reporting?.[1];
        let memUsed = null, memSpark = [];
        if (memSeries?.data?.length) {
          const usedIdx = memSeries.legend.indexOf("used");
          memUsed = memSeries.data.at(-1)[usedIdx] ?? null;
          const step = Math.max(1, Math.floor(memSeries.data.length / 32));
          for (let i = 0; i < memSeries.data.length; i += step) memSpark.push(memSeries.data[i][usedIdx] ?? 0);
        }
        // Network
        const netSeries = reporting?.[2];
        let rx = 0, tx = 0, rxSpark = [], txSpark = [];
        if (netSeries?.data?.length) {
          const rxI = netSeries.legend.indexOf("received");
          const txI = netSeries.legend.indexOf("sent");
          netSeries.data.forEach(row => {
            rxSpark.push(row[rxI] ?? 0);
            txSpark.push(row[txI] ?? 0);
          });
          const last = netSeries.data.at(-1);
          rx = last[rxI] ?? 0;
          tx = last[txI] ?? 0;
        }

        // Disk health summary
        const diskList = Array.isArray(disks) ? disks.map(d => ({
          name: d.name,
          model: d.model,
          type: d.type,
          size: +d.size || 0,
          pool: d.pool || null,
          temp: temps?.[d.name] ?? null,
          critical: d.critical ?? null,
        })) : [];
        const diskTemps = diskList.map(d => d.temp).filter(t => typeof t === "number");
        const maxTemp = diskTemps.length ? Math.max(...diskTemps) : null;
        const hotDisks = diskList.filter(d => d.temp != null && d.temp >= 50);

        setData({
          system: sys,
          cpuPct, cpuSpark,
          memUsed, memSpark, memTotal: sys.physmem,
          netRx: rx, netTx: tx,
          rxSpark: rxSpark.slice(-32), txSpark: txSpark.slice(-32),
          uptime: sys.uptime_seconds,
          pools: (pools || []).map(p => {
            const hp = poolHealth(p);
            return {
              name: p.name,
              healthy: p.healthy,
              status: p.status,
              used: +p.allocated || 0,
              total: +p.size || 0,
              pct: p.size ? Math.round(((+p.allocated || 0) / (+p.size)) * 100) : 0,
              topology: p.topology,
              ...hp,
              latestSnap: latestSnapByPool[p.name] ?? null,
            };
          }),
          disks: diskList,
          maxDiskTemp: maxTemp,
          hotDisks,
        });
        setState("live");
      } catch (e) {
        console.warn("[truenas]", e);
        if (alive) setState("error");
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return { data, state };
}
