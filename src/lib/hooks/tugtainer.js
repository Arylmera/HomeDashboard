import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

/* Tugtainer — pending container updates.
 * Requires `ENABLE_PUBLIC_API=true` on the Tugtainer container.
 * Tries `/api/public/summary` first (richer payload), falls back to
 * `/api/public/update_count`. Response shapes are version-tolerant. */
export function useTugtainer({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ pending: null, total: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const pickNum = (...vals) => vals.find(v => typeof v === "number");
    const tryEndpoints = async () => {
      try {
        const j = await getJson("/api/tugtainer/api/public/summary");
        const pending = pickNum(j?.update_count, j?.updates, j?.pending, j?.updates_available);
        const total   = pickNum(j?.total, j?.containers_total, j?.count);
        if (typeof pending === "number") return { pending, total: total ?? null, state: "live" };
      } catch { /* fall through */ }
      try {
        const j = await getJson("/api/tugtainer/api/public/update_count");
        const pending = typeof j === "number" ? j : pickNum(j?.count, j?.update_count, j?.value);
        if (typeof pending === "number") return { pending, total: null, state: "live" };
      } catch { /* fall through */ }
      return { pending: null, total: null, state: "error" };
    };
    const run = async () => {
      const next = await tryEndpoints();
      if (alive) setData(next);
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}
