/* ============================================================== *
 *  Nginx Proxy Manager — proxy hosts + redirections + streams +
 *  dead hosts + certificates + access lists.
 *
 *  Mounted as Vite middleware. Performs identity/secret token
 *  exchange against /api/tokens and caches the bearer in memory,
 *  refreshing it on 401.
 *
 *  Env:
 *    VITE_NPM_URL    base URL (also used as quicklink href)
 *    NPM_IDENTITY    NPM admin email
 *    NPM_SECRET      NPM admin password
 *
 *  Endpoints (all return { state, ... }):
 *    GET /api/npm/overview  → { proxyHosts, redirectionHosts, deadHosts,
 *                               streams, certificates, accessLists }
 *    GET /api/npm/proxy-hosts
 *    GET /api/npm/redirection-hosts
 *    GET /api/npm/dead-hosts
 *    GET /api/npm/streams
 *    GET /api/npm/certificates
 *    GET /api/npm/access-lists
 * ============================================================== */

const TTL_MS = 30_000;

let token = null;            // { value, expires:number }
const cache = new Map();     // key → { ts, payload }
const inflight = new Map();

function base() {
  return (process.env.VITE_NPM_URL || '').replace(/\/+$/, '');
}
function configured() {
  return !!(base() && process.env.NPM_IDENTITY && process.env.NPM_SECRET);
}

async function login() {
  const r = await fetch(`${base()}/api/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      identity: process.env.NPM_IDENTITY,
      secret: process.env.NPM_SECRET,
    }),
  });
  if (!r.ok) throw new Error(`npm login → ${r.status}`);
  const j = await r.json();
  if (!j?.token) throw new Error('npm login: no token in response');
  const exp = j.expires ? new Date(j.expires).getTime() : Date.now() + 60 * 60_000;
  token = { value: j.token, expires: exp - 60_000 };
  return token.value;
}

async function bearer() {
  if (token && Date.now() < token.expires) return token.value;
  return login();
}

async function npm(path, { retry = true, query = '' } = {}) {
  if (!configured()) throw new Error('npm not configured');
  const t = await bearer();
  const url = `${base()}${path}${query}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' },
  });
  if (r.status === 401 && retry) {
    token = null;
    return npm(path, { retry: false, query });
  }
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

async function getCached(key, fn) {
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL_MS) return c.payload;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const payload = await fn();
    cache.set(key, { ts: Date.now(), payload });
    inflight.delete(key);
    return payload;
  })();
  inflight.set(key, p);
  try { return await p; } catch (e) { inflight.delete(key); throw e; }
}

const expand = '?expand=owner,access_list,certificate';

const FETCHERS = {
  'proxy-hosts':       () => npm('/api/nginx/proxy-hosts', { query: expand }),
  'redirection-hosts': () => npm('/api/nginx/redirection-hosts', { query: expand }),
  'dead-hosts':        () => npm('/api/nginx/dead-hosts', { query: expand }),
  'streams':           () => npm('/api/nginx/streams', { query: expand }),
  'certificates':      () => npm('/api/nginx/certificates'),
  'access-lists':      () => npm('/api/nginx/access-lists', { query: '?expand=owner,items,clients' }),
};

async function overview() {
  const entries = await Promise.all(
    Object.entries(FETCHERS).map(async ([k, fn]) => {
      try { return [k, await fn()]; }
      catch (e) { console.warn('[npm]', k, '→', String(e?.message || e)); return [k, []]; }
    })
  );
  return Object.fromEntries(entries);
}

export function npmMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/npm/')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (!configured()) {
      return res.end(JSON.stringify({ state: 'idle' }));
    }

    const path = req.url.replace(/^\/api\/npm\//, '').replace(/\?.*$/, '');

    try {
      if (path === 'overview' || path === 'overview/') {
        const data = await getCached('overview', overview);
        return res.end(JSON.stringify({ state: 'live', ...data }));
      }
      if (FETCHERS[path]) {
        const data = await getCached(path, FETCHERS[path]);
        return res.end(JSON.stringify({ state: 'live', data }));
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (e) {
      const msg = String(e?.message || e);
      console.error('[npm]', req.url, '→', msg);
      res.statusCode = 502;
      res.end(JSON.stringify({ state: 'error', error: msg }));
    }
  };
}

export function npmPlugin() {
  return {
    name: 'npm-proxy-manager',
    configureServer(server)        { server.middlewares.use(npmMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(npmMiddleware()); },
  };
}
