/* ============================================================== *
 *  Gaming-mode toggle — pauses/resumes all qBittorrent torrents
 *  to free upstream bandwidth during gaming sessions.
 *
 *  Owns the qBit cookie session in-memory (re-login on 403),
 *  so the browser never handles credentials.
 *
 *  Env:
 *    VITE_QBITTORRENT_URL    qBit base URL (no trailing slash)
 *    QBITTORRENT_USER        WebUI username
 *    QBITTORRENT_PASS        WebUI password
 *
 *  Endpoints:
 *    GET  /api/gaming/state   → { state, total, paused, gaming }
 *    POST /api/gaming/toggle  → flip; returns the new state
 *    POST /api/gaming/pause   → force pause all
 *    POST /api/gaming/resume  → force resume all
 *
 *  "gaming" = (total > 0 && paused === total).
 * ============================================================== */

const STATE_TTL_MS = 5_000;

let cookie = null;          // SID=...
const cache = { ts: 0, payload: null };

function base() {
  return (process.env.VITE_QBITTORRENT_URL || process.env.QBITTORRENT_URL || '').replace(/\/+$/, '');
}
function configured() {
  return !!(base() && process.env.QBITTORRENT_USER && process.env.QBITTORRENT_PASS);
}

async function login() {
  const body = new URLSearchParams({
    username: process.env.QBITTORRENT_USER,
    password: process.env.QBITTORRENT_PASS,
  });
  const r = await fetch(`${base()}/api/v2/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: base(),
    },
    body,
  });
  const text = (await r.text()).trim();
  if (!r.ok || text !== 'Ok.') throw new Error(`qbit login failed: ${r.status} ${text || ''}`.trim());
  const setCookie = r.headers.get('set-cookie') || '';
  const m = setCookie.match(/SID=[^;]+/);
  if (!m) throw new Error('qbit login: no SID cookie');
  cookie = m[0];
  return cookie;
}

async function withSession(fn) {
  if (!cookie) await login();
  let r = await fn(cookie);
  if (r.status === 403) {
    cookie = null;
    await login();
    r = await fn(cookie);
  }
  return r;
}

async function torrentsInfo() {
  const r = await withSession((c) =>
    fetch(`${base()}/api/v2/torrents/info`, { headers: { Cookie: c } })
  );
  if (!r.ok) throw new Error(`torrents/info → ${r.status}`);
  return r.json();
}

async function bulkAction(action) {
  // qBit 5.x: pause→stop, resume→start. Try new first, fall back to legacy on 404.
  const newEp = action === 'pause' ? '/api/v2/torrents/stop' : '/api/v2/torrents/start';
  const legacyEp = action === 'pause' ? '/api/v2/torrents/pause' : '/api/v2/torrents/resume';
  const body = new URLSearchParams({ hashes: 'all' });

  const post = (path) => withSession((c) =>
    fetch(`${base()}${path}`, {
      method: 'POST',
      headers: {
        Cookie: c,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: base(),
      },
      body,
    })
  );

  let r = await post(newEp);
  if (r.status === 404) r = await post(legacyEp);
  if (!r.ok) throw new Error(`${action} all → ${r.status}`);
}

// "Running" = actively transferring or trying to. Anything else (paused,
// stopped, error, missingFiles, checking, moving, unknown) we treat as
// gaming-safe. So `gaming = running === 0` — pause-all reliably flips it.
const RUNNING_STATES = new Set([
  'downloading', 'forcedDL', 'metaDL', 'allocating',
  'stalledDL', 'queuedDL',
  'uploading', 'forcedUP', 'stalledUP', 'queuedUP',
]);

const DOWNLOADING_STATES = new Set([
  'downloading', 'metaDL', 'forcedDL', 'stalledDL', 'queuedDL', 'allocating',
]);

export function summarize(torrents) {
  const total = torrents.length;
  let running = 0;
  let paused = 0;
  let downloading = 0;
  for (const t of torrents) {
    if (RUNNING_STATES.has(t.state)) running++;
    if (DOWNLOADING_STATES.has(t.state)) downloading++;
    if (t.state === 'pausedDL' || t.state === 'pausedUP'
        || t.state === 'stoppedDL' || t.state === 'stoppedUP') paused++;
  }
  return { total, running, paused, downloading, gaming: total > 0 && running === 0 };
}

async function readState({ noCache } = {}) {
  const now = Date.now();
  if (!noCache && cache.payload && now - cache.ts < STATE_TTL_MS) return cache.payload;
  const torrents = await torrentsInfo();
  const payload = { state: 'live', ...summarize(torrents) };
  cache.ts = now;
  cache.payload = payload;
  return payload;
}

function invalidate() { cache.ts = 0; cache.payload = null; }

// Apply pause/resume to all torrents, give qBit time to settle, then return
// the fresh state. Settle delay is needed because /torrents/info reflects
// the action asynchronously — see server/gaming flow notes.
const SETTLE_MS = 600;
async function runAction(action) {
  await bulkAction(action);
  invalidate();
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  const data = await readState({ noCache: true });
  return { ...data, action };
}

export function gamingMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/gaming/')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (!configured()) {
      return res.end(JSON.stringify({ state: 'idle' }));
    }

    const path = req.url.replace(/^\/api\/gaming\//, '').replace(/\?.*$/, '');

    try {
      if (req.method === 'GET' && (path === 'state' || path === '')) {
        const data = await readState();
        return res.end(JSON.stringify(data));
      }
      if (req.method === 'POST' && (path === 'pause' || path === 'resume' || path === 'toggle')) {
        let action = path;
        if (path === 'toggle') {
          const cur = await readState({ noCache: true });
          action = cur.gaming ? 'resume' : 'pause';
        }
        const data = await runAction(action);
        return res.end(JSON.stringify(data));
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (e) {
      const msg = String(e?.message || e);
      console.error('[gaming]', req.url, '→', msg);
      res.statusCode = 502;
      res.end(JSON.stringify({ state: 'error', error: msg }));
    }
  };
}

/* Auto-disable gaming mode at 01:00 server-local. Idempotent: if torrents
 * are already running we skip. Container TZ must match the user's TZ
 * (set TZ=Europe/Brussels in compose) for the cutoff to fire at the right
 * wall-clock time. */
const AUTO_RESUME_HOUR = 1;
let autoResumeTimer = null;

export function msUntilNextHour(hour) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

async function autoResumeTick() {
  try {
    if (!configured()) return;
    const data = await readState({ noCache: true });
    if (data?.state === 'live' && data.gaming) {
      console.log('[gaming] auto-resume at', new Date().toISOString(), '— resuming all torrents');
      await bulkAction('resume');
      invalidate();
    }
  } catch (e) {
    console.error('[gaming] auto-resume failed:', String(e?.message || e));
  } finally {
    scheduleAutoResume();
  }
}

function scheduleAutoResume() {
  if (autoResumeTimer) clearTimeout(autoResumeTimer);
  const delay = msUntilNextHour(AUTO_RESUME_HOUR);
  autoResumeTimer = setTimeout(autoResumeTick, delay);
  // Unref so the timer never blocks process shutdown.
  autoResumeTimer.unref?.();
}

export function gamingPlugin() {
  return {
    name: 'gaming-mode',
    configureServer(server)        { server.middlewares.use(gamingMiddleware()); scheduleAutoResume(); },
    configurePreviewServer(server) { server.middlewares.use(gamingMiddleware()); scheduleAutoResume(); },
  };
}
