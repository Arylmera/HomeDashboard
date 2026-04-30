/* ---------------------------------------------------------------- *
 *  useHealth — polls /api/health and returns { [id]: status }.
 *
 *  Server probes each service's URL with a short timeout and caches
 *  the result for ~20s, so polling at 30s here is cheap.
 * ---------------------------------------------------------------- */
import { useEffect, useState } from 'react';

export function useHealth(intervalMs = 30_000) {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/health');
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && data && typeof data === 'object') setStatuses(data);
      } catch {}
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return statuses;
}
