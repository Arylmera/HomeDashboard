import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

function useAsusEndpoint(url, poll, cacheKey) {
  const { data, state, refresh } = usePolling(
    (signal) => getJson(url, { signal }),
    { poll, deps: [url], cacheKey }
  );
  // Keep legacy spread shape — pages destructure top-level keys.
  return { ...(data || {}), state, refresh };
}

export function useAsus({ poll = 15_000 } = {}) {
  return useAsusEndpoint('/api/asus/status', poll, 'asus');
}

export function useAsusNode({ poll = 15_000 } = {}) {
  return useAsusEndpoint('/api/asus/node/status', poll, 'asus-node');
}
