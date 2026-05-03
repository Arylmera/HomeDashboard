/* ============================================================== *
 *  WAN sentinel — synthetic internet-up probe.
 *
 *  Speedtest tells you bandwidth (occasionally). This tells you
 *  whether the WAN is reachable *right now*. We HEAD two anycast
 *  resolvers (Cloudflare 1.1.1.1, Quad9 9.9.9.9) and report the
 *  fastest successful response. If both fail, WAN is considered
 *  down.
 *
 *  Endpoint:
 *    GET /api/wan → { state, up, latencyMs, when, target }
 *
 *  Probe runs at most every PROBE_TTL_MS; concurrent requests share
 *  the same in-flight probe.
 * ============================================================== */

const PROBE_TTL_MS = 30_000;
const TIMEOUT_MS   = 4_000;

const TARGETS = [
  { url: 'https://1.1.1.1/cdn-cgi/trace', name: 'cloudflare' },
  { url: 'https://9.9.9.9/',              name: 'quad9' },
];

let cached = null;     // { up, latencyMs, when, target }
let inflight = null;

async function probeOne(t) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const r = await fetch(t.url, { method: 'GET', redirect: 'manual', signal: ctrl.signal });
    // Any HTTP response (even 4xx/5xx) means the WAN reached the host.
    return { up: true, latencyMs: Date.now() - t0, target: t.name, status: r.status };
  } catch {
    return { up: false, latencyMs: null, target: t.name };
  } finally {
    clearTimeout(timer);
  }
}

async function probeAll() {
  const results = await Promise.all(TARGETS.map(probeOne));
  const ups = results.filter(r => r.up);
  if (ups.length === 0) {
    return { up: false, latencyMs: null, when: Date.now(), target: null };
  }
  // Pick the fastest successful target as the displayed latency.
  ups.sort((a, b) => a.latencyMs - b.latencyMs);
  const best = ups[0];
  return { up: true, latencyMs: best.latencyMs, when: Date.now(), target: best.target };
}

async function getStatus() {
  if (cached && Date.now() - cached.when < PROBE_TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await probeAll();
      cached = r;
      return r;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function wanMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/wan')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const s = await getStatus();
      res.end(JSON.stringify({ state: 'live', ...s }));
    } catch (e) {
      res.statusCode = 502;
      res.end(JSON.stringify({ state: 'error', error: String(e?.message || e) }));
    }
  };
}

export function wanPlugin() {
  return {
    name: 'wan-sentinel',
    configureServer(server)        { server.middlewares.use(wanMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(wanMiddleware()); },
  };
}
