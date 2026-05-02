/* Tiny generic JSON fetcher shared by service hooks.
 * All upstream calls go through Vite proxies at /api/<service>/*; the
 * dev server (and any prod reverse-proxy) injects auth headers from
 * .env so credentials never reach the browser. */
export async function getJson(url, init = {}) {
  const r = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
