import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

/* WAN sentinel — pings /api/wan which the server keeps fresh by
 * probing 1.1.1.1 / 9.9.9.9. */
export function useWan({ poll = 30_000 } = {}) {
  const { data, state } = usePolling(
    (signal) => getJson('/api/wan', { signal }),
    { poll, cacheKey: 'wan'}
  );
  return {
    state: data?.state || state,
    up: data?.up ?? null,
    latencyMs: data?.latencyMs ?? null,
    when: data?.when ?? null,
    target: data?.target ?? null,
  };
}
