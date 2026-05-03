import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

// API returns download/upload in bytes/sec — normalize to Mbps here so
// every consumer can render `${st.down} Mbps` without thinking.
export function bpsToMbps(v) {
  if (v == null) return null;
  const n = +v;
  if (!Number.isFinite(n)) return null;
  // Heuristic: values > 1e5 are byte/s (raw). Already-Mbps stay <= 10000.
  return n > 10000 ? +(n * 8 / 1e6).toFixed(1) : +n.toFixed(1);
}

export function useSpeedtest({ poll = 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const j = await getJson('/api/speedtest/api/speedtest/latest', { signal });
      const d = j?.data || j;
      return {
        down: bpsToMbps(d.download ?? d.download_speed),
        up:   bpsToMbps(d.upload ?? d.upload_speed),
        ping: d.ping != null ? +(+d.ping).toFixed(1) : null,
        when: d.created_at || d.timestamp || null,
      };
    },
    { poll }
  );
  return { state, down: null, up: null, ping: null, when: null, ...(data || {}) };
}

export function useSpeedtestHistory({ limit = 24, poll = 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const j = await getJson(
        `/api/speedtest/api/speedtest/list?per_page=${limit}&page=1`,
        { signal }
      );
      const rows = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
      return rows.map((d) => ({
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
    },
    { poll, deps: [limit] }
  );
  return { state, items: data || [] };
}
