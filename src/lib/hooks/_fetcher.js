/* Tiny generic JSON fetcher shared by service hooks.
 *
 * All upstream calls go through Vite proxies at /api/<service>/*; the
 * dev server (and any prod reverse-proxy) injects auth headers from
 * .env so credentials never reach the browser.
 *
 * Honours an AbortSignal so usePolling can cancel stale requests on
 * unmount or rapid dep changes. Times out after `timeoutMs` even when
 * the caller doesn't pass a signal — prevents one slow upstream from
 * starving the polling loop.
 */
const DEFAULT_TIMEOUT = 15_000;

export async function getJson(url, init = {}) {
  const { signal: outerSignal, timeoutMs = DEFAULT_TIMEOUT, ...rest } = init;

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(new Error('timeout')), timeoutMs);
  // Bridge an outer signal to our internal controller.
  const onAbort = () => ctl.abort(outerSignal.reason);
  if (outerSignal) {
    if (outerSignal.aborted) ctl.abort(outerSignal.reason);
    else outerSignal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const r = await fetch(url, {
      ...rest,
      headers: { Accept: 'application/json', ...(rest.headers || {}) },
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return await r.json();
  } finally {
    clearTimeout(t);
    if (outerSignal) outerSignal.removeEventListener('abort', onAbort);
  }
}

// Parallel `getJson` that resolves with `null` on individual failures
// rather than rejecting. Used by aggregator hooks (arr, glances) that
// need partial data — e.g. show CPU even if /sensors is down.
export async function getJsonAll(urls, init = {}) {
  return Promise.all(
    urls.map((u) => getJson(u, init).catch(() => null))
  );
}
