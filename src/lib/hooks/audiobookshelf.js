import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

export function useAudiobookshelf({ poll = 5 * 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const j = await getJson('/api/audiobookshelf/api/libraries', { signal });
      return j?.libraries ?? [];
    },
    { poll }
  );
  return { libraries: data, state };
}
