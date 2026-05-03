import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

// Qui — qBittorrent dashboard, multi-instance aggregator.
const EMPTY = { instances: null, dl: 0, up: 0, active: 0, total: 0 };

// Normalize the heterogenous /torrents shapes Qui returns across versions.
export function normalizeTorrents(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.torrents)) return payload.torrents;
  if (Array.isArray(payload?.items)) return payload.items;
  if (payload && typeof payload === 'object') return Object.values(payload);
  return [];
}

export function useQui({ poll = 15_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const instances = await getJson('/api/qui/api/instances', { signal });
      if (!Array.isArray(instances)) throw new Error('qui_bad_instances');
      const reachable = instances.filter((i) => i.connected !== false);

      const perInstance = await Promise.all(reachable.map(async (inst) => {
        const id = inst.id ?? inst.ID;
        const [stats, torrents] = await getJsonAll([
          `/api/qui/api/instances/${id}/stats`,
          `/api/qui/api/instances/${id}/torrents`,
        ], { signal });
        return { stats, torrents };
      }));

      let dl = 0, up = 0, active = 0, total = 0;
      for (const { stats, torrents } of perInstance) {
        if (stats) {
          dl += stats.dl_info_speed ?? stats.dlInfoSpeed ?? 0;
          up += stats.up_info_speed ?? stats.upInfoSpeed ?? 0;
        }
        const list = normalizeTorrents(torrents);
        total += list.length;
        for (const t of list) {
          if ((t?.dlspeed || 0) + (t?.upspeed || 0) > 0) active++;
        }
      }
      return { instances, dl, up, active, total };
    },
    { poll, cacheKey: 'qui'}
  );
  return { state, ...(data || EMPTY) };
}
