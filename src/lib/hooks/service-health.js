import { useState, useEffect } from 'react';

// Best-effort no-cors HEAD ping from the browser. Different from
// useHealth (server-side probe via /api/health).
export function useServiceHealth(services, intervalMs = 60_000) {
  const [map, setMap] = useState({});
  const key = services.map(s => s.id).join("|");
  useEffect(() => {
    let alive = true;
    const ping = async (s) => {
      try {
        await fetch(s.url, { mode: "no-cors", method: "HEAD", cache: "no-store", redirect: "follow" });
        return true;
      } catch { return false; }
    };
    const run = async () => {
      const out = {};
      await Promise.all(services.map(async (s) => { out[s.id] = await ping(s); }));
      if (alive) setMap(out);
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs]);
  return map;
}
