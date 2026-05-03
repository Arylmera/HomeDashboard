import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

/* WAN sentinel — pings /api/wan which the server keeps fresh by
 * probing 1.1.1.1 / 9.9.9.9. Returns { state, up, latencyMs, when }. */
export function useWan({ poll = 30_000 } = {}) {
  const [s, setS] = useState({ state: 'loading', up: null, latencyMs: null, when: null, target: null });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson('/api/wan');
        if (!alive) return;
        setS({
          state: j.state || 'live',
          up: j.up ?? null,
          latencyMs: j.latencyMs ?? null,
          when: j.when ?? null,
          target: j.target ?? null,
        });
      } catch {
        if (alive) setS(p => ({ ...p, state: 'error' }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return s;
}
