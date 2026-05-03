import { useMemo } from 'react';
import { usePolling } from './usePolling.js';

// Best-effort no-cors HEAD ping from the browser. Different from
// useHealth (server-side probe via /api/health). Used by the nav menu
// to color-code link tiles without hitting any auth-gated endpoints.
async function pingService(s, signal) {
  try {
    await fetch(s.url, {
      mode: 'no-cors', method: 'HEAD',
      cache: 'no-store', redirect: 'follow', signal,
    });
    return true;
  } catch { return false; }
}

export function useServiceHealth(services, intervalMs = 60_000) {
  // Stable dep key — avoids re-running the polling effect when the
  // caller passes a freshly-built array containing the same services.
  const key = useMemo(() => services.map((s) => s.id).join('|'), [services]);

  const { data } = usePolling(
    async (signal) => {
      const out = {};
      await Promise.all(services.map(async (s) => {
        out[s.id] = await pingService(s, signal);
      }));
      return out;
    },
    { poll: intervalMs, deps: [key] }
  );
  return data || {};
}
