import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

// Qui — qBittorrent dashboard, multi-instance aggregator.
export function useQui({ poll = 15_000 } = {}) {
  const [data, setData] = useState({ instances: null, dl: 0, up: 0, active: 0, total: 0, state: 'loading' });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const instances = await getJson('/api/qui/api/instances');
        if (!Array.isArray(instances)) throw new Error('bad instances payload');
        // Skip instances Qui can't currently reach — calls would just error.
        const reachable = instances.filter(i => i.connected !== false);
        const perInstance = await Promise.all(reachable.map(async (inst) => {
          const id = inst.id ?? inst.ID;
          const [stats, torrents] = await Promise.all([
            getJson(`/api/qui/api/instances/${id}/stats`).catch(() => null),
            getJson(`/api/qui/api/instances/${id}/torrents`).catch(() => null),
          ]);
          return { stats, torrents };
        }));
        if (!alive) return;
        let dl = 0, up = 0, active = 0, total = 0;
        for (const { stats, torrents } of perInstance) {
          if (stats) {
            dl += stats.dl_info_speed ?? stats.dlInfoSpeed ?? 0;
            up += stats.up_info_speed ?? stats.upInfoSpeed ?? 0;
          }
          // /torrents may return an array directly or `{ torrents: [...] }` /
          // `{ items: [...] }` — handle every plausible shape.
          const list = Array.isArray(torrents)
            ? torrents
            : Array.isArray(torrents?.torrents)
              ? torrents.torrents
              : Array.isArray(torrents?.items)
                ? torrents.items
                : torrents && typeof torrents === 'object'
                  ? Object.values(torrents)
                  : [];
          total += list.length;
          for (const t of list) {
            if ((t?.dlspeed || 0) + (t?.upspeed || 0) > 0) active++;
          }
        }
        setData({ instances, dl, up, active, total, state: 'live' });
      } catch { if (alive) setData(d => ({ ...d, state: 'error' })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}
