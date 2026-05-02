import { useState, useEffect } from 'react';

// Pi-hole v6 — auth flow client-side (key is browser-visible).
const PIHOLE_KEY = import.meta.env.VITE_PIHOLE_KEY || "";

export function usePihole({ poll = 30_000 } = {}) {
  const [s, setS] = useState({ state: "loading", queries: null, blocked: null, pct: null, clients: null });
  useEffect(() => {
    let alive = true;
    let sid = null;
    const auth = async () => {
      if (!PIHOLE_KEY) return null;
      try {
        const r = await fetch("/api/pihole/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: PIHOLE_KEY }),
        });
        const j = await r.json();
        return j?.session?.sid || null;
      } catch { return null; }
    };
    const run = async () => {
      sid = sid || await auth();
      try {
        const r = await fetch("/api/pihole/api/stats/summary", {
          headers: sid ? { sid } : {},
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        if (j?.queries) {
          setS({
            state: "live",
            queries: j.queries.total,
            blocked: j.queries.blocked,
            pct: j.queries.percent_blocked,
            clients: j.clients?.active,
          });
        } else {
          setS(p => ({ ...p, state: "error" }));
        }
      } catch { if (alive) setS(p => ({ ...p, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return s;
}
