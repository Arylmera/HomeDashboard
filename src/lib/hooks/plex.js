import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

export function usePlex({ poll = 30_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const [sess, libs] = await getJsonAll([
        '/api/plex/status/sessions',
        '/api/plex/library/sections',
      ], { signal });
      // Sessions endpoint is the canonical liveness probe.
      if (!sess) throw new Error('plex_unavailable');
      const dirs = libs?.MediaContainer?.Directory ?? [];
      // /library/sections does not include item counts — fetch totalSize per section.
      const counts = await Promise.all(dirs.map((d) =>
        getJson(`/api/plex/library/sections/${d.key}/all?X-Plex-Container-Size=0&X-Plex-Container-Start=0`, { signal })
          .then((r) => r?.MediaContainer?.totalSize ?? 0)
          .catch(() => 0)
      ));
      return {
        sessions: sess?.MediaContainer ?? null,
        libraries: dirs.map((d, i) => ({ ...d, count: counts[i] })),
      };
    },
    { poll }
  );
  return { sessions: data?.sessions ?? null, libraries: data?.libraries ?? null, state };
}

// Legacy compat for Home.jsx.
export function usePlexSessions() {
  const { sessions } = usePlex();
  return sessions?.size ?? null;
}
