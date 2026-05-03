import { usePolling } from './usePolling.js';
import { getJsonAll } from './_fetcher.js';

const URLS = [
  '/api/glances/api/4/cpu',
  '/api/glances/api/4/mem',
  '/api/glances/api/4/fs',
  '/api/glances/api/4/sensors',
  '/api/glances/api/4/network',
  '/api/glances/api/4/percpu',
];

export function useGlances({ poll = 15_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const [cpu, mem, fs, sensors, network, percpu] =
        await getJsonAll(URLS, { signal });
      // cpu+mem are the canonical liveness probe — without either,
      // Glances is effectively down even if /sensors happened to
      // 200 from a stale cache.
      if (!cpu && !mem) throw new Error('glances_unavailable');
      return { cpu, mem, fs, sensors, network, percpu };
    },
    { poll, cacheKey: 'glances'}
  );
  return { data, state };
}
