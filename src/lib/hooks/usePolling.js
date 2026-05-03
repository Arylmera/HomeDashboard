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
export function usePolling(fn, { poll = 60_000, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
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
      setError(null);
    } catch (e) {
      if (signal?.aborted || e?.name === 'AbortError') return;
      setError(e);
      setState('error');
      // Keep last known good `data`. UIs surface stale-while-error.
      console.warn('[usePolling]', e?.message || e);
    }
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    run(ctl.signal);
    if (!poll) return () => ctl.abort();
    const id = setInterval(() => run(ctl.signal), poll);
    return () => { ctl.abort(); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, ...deps]);

  const refresh = useCallback(() => run(), [run]);
  return { data, state, error, refresh };
}
