import { useEffect, useRef, useState, useCallback } from 'react';

/* ============================================================== *
 *  usePolling — generic data-fetching hook used by every service.
 *
 *  Replaces the duplicated `useState + useEffect + setInterval +
 *  alive-flag + .catch()-swallow` boilerplate that lived in 25+
 *  `src/lib/hooks/*.js` files.
 *
 *  Contract:
 *    fn:          async () => any         caller-supplied fetcher
 *    poll:        number (ms, default 60s) interval between runs;
 *                                          0 disables polling
 *    deps:        any[]                    effect deps; fn is also
 *                                          captured at first run
 *
 *  Returns:
 *    { data, state, error, refresh }
 *      state ∈ "loading" | "live" | "error"
 *      refresh(): manual trigger, returns Promise
 *
 *  Cancellation: if the component unmounts or `deps` change, in-
 *  flight responses are dropped via the `alive` flag. The fetcher
 *  itself is responsible for honouring an AbortSignal (passed in
 *  via fn's argument) if the caller wants true network cancellation.
 * ============================================================== */
// localStorage cache so MPA navigations and full browser restarts can
// render last-known data instantly while the live fetch runs (SWR
// pattern: stale-while-revalidate).
//
// Default TTL is 7 days — for a home dashboard, rendering 6 h-old
// numbers immediately and then refreshing is far better than blocking
// on a slow upstream. Callers can pass a tighter `cacheTtl` (or 0 to
// disable) for data where staleness is dangerous.
const CACHE_PREFIX = 'usePolling:';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function readCache(key, ttl) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (typeof t !== 'number' || Date.now() - t > ttl) return null;
    return { v, t };
  } catch { return null; }
}
function writeCache(key, v) {
  if (!key) return;
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v })); }
  catch (e) {
    // Quota exceeded — drop oldest usePolling entries and retry once.
    if (e?.name === 'QuotaExceededError') {
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
        keys.sort((a, b) => {
          try { return JSON.parse(localStorage.getItem(a)).t - JSON.parse(localStorage.getItem(b)).t; }
          catch { return 0; }
        });
        for (const k of keys.slice(0, Math.max(1, Math.floor(keys.length / 2)))) localStorage.removeItem(k);
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v }));
      } catch {}
    }
  }
}

export function usePolling(fn, { poll = 60_000, deps = [], cacheKey = null, cacheTtl = DEFAULT_TTL } = {}) {
  const cached = cacheKey ? readCache(cacheKey, cacheTtl) : null;
  const [data, setData] = useState(cached?.v ?? null);
  // `stale` means we rendered from cache and a fresh fetch is in flight.
  // `live` arrives once the in-flight fetch resolves successfully.
  const [state, setState] = useState(cached ? 'stale' : 'loading');
  const [updatedAt, setUpdatedAt] = useState(cached?.t ?? null);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (signal) => {
    // Hooks pass `null` to disable polling without unmounting (e.g.
    // Sonos group fetcher gated on having a household ID). Skip the
    // run but leave `state` as-is so callers can map to "idle".
    if (typeof fnRef.current !== 'function') return;
    try {
      const result = await fnRef.current(signal);
      if (signal?.aborted) return;
      setData(result);
      setState('live');
      setUpdatedAt(Date.now());
      setError(null);
      if (cacheKey && result != null) writeCache(cacheKey, result);
    } catch (e) {
      if (signal?.aborted || e?.name === 'AbortError') return;
      setError(e);
      setState('error');
      // Keep last known good `data`. UIs surface stale-while-error.
      console.warn('[usePolling]', e?.message || e);
    }
  }, [cacheKey]);

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    if (!poll) return () => ctl.abort();
    const id = setInterval(() => run(ctl.signal), poll);
    return () => { ctl.abort(); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, ...deps]);

  const refresh = useCallback(() => run(), [run]);
  return { data, state, error, refresh, updatedAt };
}
