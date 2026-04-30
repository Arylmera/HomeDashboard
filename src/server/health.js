/* ============================================================== *
 *  Health API — server-side probes for service reachability.
 *
 *  Mounted as Vite middleware in both `dev` and `preview` modes
 *  (see vite.config.js). Performs the fetch from the Node side so
 *  CORS doesn't block the browser, and caches results briefly to
 *  avoid hammering upstreams when many tabs poll at once.
 *
 *  Endpoint:
 *    GET  /api/health  →  { [id]: "up" | "warn" | "down" }
 *
 *  Status mapping:
 *    network error / timeout      → "down"
 *    HTTP 5xx                     → "warn"
 *    any other HTTP response      → "up"   (reachable; auth wall = up)
 * ============================================================== */
import { ALL_SERVICES } from '../lib/services.js';

const TTL_MS     = 20_000;
const TIMEOUT_MS = 4_000;

const cache = new Map();   // id → { status, ts }
const inflight = new Map();// id → Promise<status>

async function probe(svc) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(svc.url, {
      method: 'GET',
      redirect: 'manual',
      signal: ctrl.signal,
    });
    if (r.status >= 500 && r.status < 600) return 'warn';
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(t);
  }
}

function getStatus(svc) {
  const c = cache.get(svc.id);
  if (c && Date.now() - c.ts < TTL_MS) return Promise.resolve(c.status);
  if (inflight.has(svc.id)) return inflight.get(svc.id);
  const p = (async () => {
    const status = await probe(svc);
    cache.set(svc.id, { status, ts: Date.now() });
    inflight.delete(svc.id);
    return status;
  })();
  inflight.set(svc.id, p);
  return p;
}

export function healthMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/health')) return next();
    try {
      const entries = await Promise.all(
        ALL_SERVICES.map(async (s) => [s.id, await getStatus(s)])
      );
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(Object.fromEntries(entries)));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(e?.message || e) }));
    }
  };
}

export function healthPlugin() {
  return {
    name: 'health-api',
    configureServer(server)        { server.middlewares.use(healthMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(healthMiddleware()); },
  };
}
