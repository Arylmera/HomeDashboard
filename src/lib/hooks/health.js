/* useHealth — polls /api/health and returns { [id]: status }.
 *
 * Server probes each service's URL with a short timeout and caches the
 * result for ~20s, so polling at 30s here is cheap. Returns the
 * statuses map directly (legacy shape) — callers do not see usePolling
 * state envelope to keep call-sites unchanged. */
import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

export function useHealth(intervalMs = 30_000) {
  const { data } = usePolling(
    (signal) => getJson('/api/health', { signal }),
    { poll: intervalMs }
  );
  return data && typeof data === 'object' ? data : {};
}
