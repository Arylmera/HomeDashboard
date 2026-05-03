import { request as httpReq } from 'node:http';
import { request as httpsReq } from 'node:https';

/**
 * /api/multi — generic parallel fan-out endpoint.
 *
 *   GET /api/multi?u=/api/glances&u=/api/arcane/containers&u=/api/wan
 *
 * The server issues each `u=<path>` request to itself in parallel (so
 * the existing /api/<svc> proxies inject auth headers as usual), then
 * returns a flat JSON map of `{ '<path>': { ok, status, data } }`.
 *
 * Frontend benefits:
 *   - 1 browser request instead of N (no per-call HTTP/TLS overhead)
 *   - one shared abort signal
 *   - server-side TTL coalescing across users/tabs (?ttl=N seconds)
 *
 * Security: paths MUST start with `/api/` and MUST NOT start with
 * `/api/multi` (no recursion). Anything else is silently dropped.
 */
const MAX_PATHS = 24;
const DEFAULT_TIMEOUT_MS = 5000;

function loopback(req, path, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const isHttps = !!req.socket?.encrypted;
    const lib = isHttps ? httpsReq : httpReq;
    const r = lib(
      {
        host: '127.0.0.1',
        port: req.socket?.localPort,
        path,
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          accept: 'application/json',
          // Forward cookies so session-auth proxies (Pi-hole SID,
          // qBittorrent) keep their session.
          ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          let data;
          try { data = JSON.parse(body); } catch { data = body; }
          resolve({ ok: res.statusCode < 400, status: res.statusCode, data });
        });
        res.on('error', (e) => resolve({ ok: false, error: e.message }));
      },
    );
    r.on('error', (e) => resolve({ ok: false, error: e.message }));
    r.setTimeout(timeout, () => { r.destroy(); resolve({ ok: false, error: 'timeout' }); });
    r.end();
  });
}

export function multiPlugin() {
  const cache = new Map(); // path → { t, v }

  function install(server) {
    server.middlewares.use('/api/multi', (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end();
        return;
      }
      const url = new URL(req.url, 'http://x');
      const paths = url.searchParams
        .getAll('u')
        .filter((p) => typeof p === 'string'
          && p.startsWith('/api/')
          && !p.startsWith('/api/multi'))
        .slice(0, MAX_PATHS);
      const ttlMs = Math.max(0, Number(url.searchParams.get('ttl')) || 0) * 1000;
      const now = Date.now();

      Promise.all(
        paths.map(async (p) => {
          if (ttlMs > 0) {
            const e = cache.get(p);
            if (e && now - e.t < ttlMs) return [p, e.v];
          }
          const v = await loopback(req, p);
          if (ttlMs > 0 && v.ok) cache.set(p, { t: Date.now(), v });
          return [p, v];
        }),
      )
        .then((entries) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(Object.fromEntries(entries)));
        })
        .catch((e) => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message || String(e) }));
        });
    });
  }

  return {
    name: 'multi-aggregator',
    configureServer: install,
    configurePreviewServer: install,
  };
}
