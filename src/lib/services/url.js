/* Base URL builder for the SERVICES registry.
 *
 * Auto-detects mode from the browser's current host:
 *   - If served from the LAN host (192.168.1.100) → emit LAN URLs (host:port).
 *   - If served from the FQDN (or anything else) → emit FQDN subdomain URLs.
 *
 * Override at runtime with `?mode=lan` / `?mode=fqdn` (sticky in localStorage),
 * or by setting `window.__URL_MODE__` before this module loads.
 */

export const LAN  = "http://192.168.1.100";
export const FQDN = "https://__sub__.arylmera.duckdns.org";

const LAN_HOST = new URL(LAN).hostname;
const STORAGE_KEY = "arylmera.urlMode";

function detectMode() {
  if (typeof window === "undefined") return "fqdn";
  if (window.__URL_MODE__ === "lan" || window.__URL_MODE__ === "fqdn") return window.__URL_MODE__;

  try {
    const q = new URLSearchParams(window.location.search).get("mode");
    if (q === "lan" || q === "fqdn") { localStorage.setItem(STORAGE_KEY, q); return q; }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "lan" || saved === "fqdn") return saved;
  } catch { /* sandboxed / no storage */ }

  return window.location.hostname === LAN_HOST ? "lan" : "fqdn";
}

const PREFER = detectMode();

export const url = (sub, port) =>
  PREFER === "fqdn" && sub
    ? FQDN.replace("__sub__", sub)
    : `${LAN}:${port}`;
