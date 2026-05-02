import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

export function usePlex({ poll = 30_000 } = {}) {
  const [data, setData] = useState({ sessions: null, libraries: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [sess, libs] = await Promise.all([
          getJson("/api/plex/status/sessions").catch(() => null),
          getJson("/api/plex/library/sections").catch(() => null),
        ]);
        const dirs = libs?.MediaContainer?.Directory ?? [];
        // /library/sections does not return item counts — fetch totalSize per section.
        const counts = await Promise.all(dirs.map(d =>
          getJson(`/api/plex/library/sections/${d.key}/all?X-Plex-Container-Size=0&X-Plex-Container-Start=0`)
            .then(r => r?.MediaContainer?.totalSize ?? 0)
            .catch(() => 0)
        ));
        const enriched = dirs.map((d, i) => ({ ...d, count: counts[i] }));
        if (!alive) return;
        setData({
          sessions: sess?.MediaContainer ?? null,
          libraries: enriched,
          state: sess ? "live" : "error",
        });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// Legacy compat for Home.jsx.
export function usePlexSessions() {
  const { sessions } = usePlex();
  return sessions?.size ?? null;
}
