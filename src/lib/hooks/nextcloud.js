import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

export function useNextcloud({ poll = 5 * 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const j = await getJson('/api/nextcloud/ocs/v1.php/cloud/user?format=json', {
        signal,
        headers: { 'OCS-APIRequest': 'true' },
      });
      return j?.ocs?.data ?? null;
    },
    { poll, cacheKey: 'nextcloud'}
  );
  return { info: data ?? null, state };
}
