import { useRef } from 'react';
import { usePolling } from './usePolling.js';

// Pi-hole v6 — auth flow client-side (key is browser-visible).
const PIHOLE_KEY = import.meta.env.VITE_PIHOLE_KEY || '';

const EMPTY = { queries: null, blocked: null, pct: null, clients: null };

async function authenticate() {
  if (!PIHOLE_KEY) return null;
  try {
    const r = await fetch('/api/pihole/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PIHOLE_KEY }),
    });
    const j = await r.json();
    return j?.session?.sid || null;
  } catch { return null; }
}

export function usePihole({ poll = 30_000 } = {}) {
  // Re-auth lazily; sid is reused across ticks until a request fails.
  const sidRef = useRef(null);

  const { data, state } = usePolling(
    async (signal) => {
      if (!sidRef.current) sidRef.current = await authenticate();
      const r = await fetch('/api/pihole/api/stats/summary', {
        signal,
        headers: sidRef.current ? { sid: sidRef.current } : {},
      });
      if (r.status === 401) { sidRef.current = null; throw new Error('pihole_auth_expired'); }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j?.queries) throw new Error('pihole_bad_payload');
      return {
        queries: j.queries.total,
        blocked: j.queries.blocked,
        pct: j.queries.percent_blocked,
        clients: j.clients?.active,
      };
    },
    { poll }
  );

  return { state, ...(data || EMPTY) };
}
