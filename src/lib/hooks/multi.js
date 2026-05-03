import { usePolling } from './usePolling.js';

/**
 * useMulti(paths, { poll, ttl })
 *
 * Single batched request to /api/multi for an array of /api/* paths.
 * The server fetches them in parallel via loopback and returns a flat
 * map keyed by path: { '/api/x': { ok, status, data } }.
 *
 * Use this on pages that fan out to many independent upstreams (home,
 * network) to cut N browser round-trips down to one. Each per-source
 * response can then be destructured by the consumer.
 *
 *   const { data: m } = useMulti(['/api/glances', '/api/arcane'], { poll: 30_000, ttl: 10 });
 *   const glances = m?.['/api/glances']?.data;
 *
 * Cached via usePolling's localStorage SWR layer; the cacheKey is the
 * sorted path list so different queries don't clobber each other.
 */
export function useMulti(paths, { poll = 30_000, ttl = 10 } = {}) {
  const sorted = Array.isArray(paths) ? [...paths].sort() : [];
  const url = '/api/multi?ttl=' + encodeURIComponent(ttl)
    + sorted.map((p) => '&u=' + encodeURIComponent(p)).join('');
  const cacheKey = 'multi:' + sorted.join('|');
  return usePolling(
    async (signal) => {
      const r = await fetch(url, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    { poll, deps: [url], cacheKey },
  );
}
