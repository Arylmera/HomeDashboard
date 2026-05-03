import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

export function useSeerr({ poll = 60_000 } = {}) {
  const { data, state } = usePolling(
    (signal) => getJson('/api/seerr/api/v1/request/count', { signal }),
    { poll }
  );
  return { counts: data, state };
}
