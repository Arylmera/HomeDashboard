import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

const EMPTY = {
  proxyHosts: [], redirectionHosts: [], deadHosts: [],
  streams: [], certificates: [], accessLists: [],
};

export function useNpm({ poll = 30_000 } = {}) {
  const { data, state, refresh } = usePolling(
    async (signal) => {
      const j = await getJson('/api/npm/overview', { signal });
      if (j.state !== 'live') {
        const err = new Error(j.error || j.state || 'npm_unavailable');
        err.serverState = j.state;
        throw err;
      }
      return {
        proxyHosts:       j['proxy-hosts'] || [],
        redirectionHosts: j['redirection-hosts'] || [],
        deadHosts:        j['dead-hosts'] || [],
        streams:          j['streams'] || [],
        certificates:     j['certificates'] || [],
        accessLists:      j['access-lists'] || [],
      };
    },
    { poll, cacheKey: 'npm'}
  );
  return { state, ...(data || EMPTY), refresh };
}
