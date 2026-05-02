import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

// API returns download/upload in bytes/sec — normalize to Mbps here so
// every consumer can render `${st.down} Mbps` without thinking.
function bpsToMbps(v) {
  if (v == null) return null;
  const n = +v;
  if (!Number.isFinite(n)) return null;
  // Heuristic: values > 1e5 are byte/s (raw). Already-Mbps values stay <= 10000.
  return n > 10000 ? +(n * 8 / 1e6).toFixed(1) : +n.toFixed(1);
}

export function useSpeedtest({ poll = 60_000 } = {}) {
  const [s, setS] = useState({ state: "loading", down: null, up: null, ping: null, when: null });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson("/api/speedtest/api/speedtest/latest");
        const d = j?.data || j;
        if (!alive) return;
        setS({
          state: "live",
          down: bpsToMbps(d.download ?? d.download_speed),
          up:   bpsToMbps(d.upload ?? d.upload_speed),
          ping: d.ping != null ? +(+d.ping).toFixed(1) : null,
          when: d.created_at || d.timestamp || null,
        });
      } catch { if (alive) setS(p => ({ ...p, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return s;
}

export function useSpeedtestHistory({ limit = 24, poll = 60_000 } = {}) {
  const [s, setS] = useState({ state: "loading", items: [] });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson(`/api/speedtest/api/speedtest/list?per_page=${limit}&page=1`);
        const rows = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
        const items = rows.map(d => ({
          id: d.id,
          down: bpsToMbps(d.download ?? d.download_speed),
          up:   bpsToMbps(d.upload ?? d.upload_speed),
          ping: d.ping != null ? +(+d.ping).toFixed(1) : null,
          loss: d.packet_loss != null ? +(+d.packet_loss).toFixed(1) : null,
          server: d.server_name || d.server_host || null,
          isp: d.isp || null,
          when: d.created_at || d.timestamp || null,
          healthy: d.healthy !== false,
        })).reverse();
        if (!alive) return;
        setS({ state: "live", items });
      } catch { if (alive) setS(p => ({ ...p, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, limit]);
  return s;
}
