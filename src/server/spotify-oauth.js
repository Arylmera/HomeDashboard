/* ============================================================== *
 *  Spotify OAuth2 — Authorization Code flow.
 *
 *  Endpoints:
 *    GET  /api/spotify/oauth/login    → 302 to accounts.spotify.com
 *    GET  /api/spotify/oauth/callback → exchanges code, persists tokens
 *    GET  /api/spotify/oauth/status   → { configured, authenticated }
 *    POST /api/spotify/oauth/logout   → clears tokens
 *    *    /api/spotify/v1/*           → proxied to api.spotify.com with Bearer
 *
 *  Tokens persist in $PREFS_DB under key `spotify:tokens`.
 *  Auto-refresh fires when access_token has < 60 s left.
 * ============================================================== */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const STATE_KEY = 'spotify:tokens';
const AUTH_BASE = 'https://accounts.spotify.com';
const API_BASE  = 'https://api.spotify.com';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
].join(' ');

let db = null;
function open() {
  if (db) return db;
  const path = process.env.PREFS_DB || '/data/prefs.db';
  try { mkdirSync(dirname(path), { recursive: true }); } catch {}
  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS prefs (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL
  )`);
  return db;
}
function loadTokens() {
  const row = open().prepare('SELECT value FROM prefs WHERE key = ?').get(STATE_KEY);
  return row ? JSON.parse(row.value) : null;
}
function saveTokens(tok) {
  open().prepare(
    'INSERT INTO prefs(key,value,updated_at) VALUES(?,?,?) ' +
    'ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
  ).run(STATE_KEY, JSON.stringify(tok), Date.now());
}
function clearTokens() {
  open().prepare('DELETE FROM prefs WHERE key = ?').run(STATE_KEY);
}

function isConfigured() {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_REDIRECT_URI);
}

function basicAuth() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });
  const r = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuth() },
    body,
  });
  if (!r.ok) throw new Error(`spotify_token_exchange ${r.status} ${await r.text()}`);
  const j = await r.json();
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    scope: j.scope,
    expires_at: Date.now() + (j.expires_in - 60) * 1000,
  };
}

async function refreshTokens(tokens) {
  if (!tokens?.refresh_token) throw new Error('no_refresh_token');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });
  const r = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuth() },
    body,
  });
  if (!r.ok) throw new Error(`spotify_refresh ${r.status} ${await r.text()}`);
  const j = await r.json();
  const next = {
    access_token: j.access_token,
    refresh_token: j.refresh_token || tokens.refresh_token,
    scope: j.scope || tokens.scope,
    expires_at: Date.now() + (j.expires_in - 60) * 1000,
  };
  saveTokens(next);
  return next;
}

async function getAccessToken() {
  let t = loadTokens();
  if (!t) return null;
  if (Date.now() >= (t.expires_at || 0)) {
    t = await refreshTokens(t);
  }
  return t.access_token;
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 256 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function spotifyOAuthMiddleware() {
  return async (req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/api/spotify/') && url !== '/api/spotify') return next();

    if (url.startsWith('/api/spotify/oauth/login')) {
      if (!isConfigured()) {
        return send(res, 500, { error: 'SPOTIFY_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI not set' });
      }
      const params = new URLSearchParams({
        client_id: process.env.SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        scope: SCOPES,
        show_dialog: 'true',
      });
      res.statusCode = 302;
      res.setHeader('Location', `${AUTH_BASE}/authorize?${params.toString()}`);
      res.end();
      return;
    }

    if (url.startsWith('/api/spotify/oauth/callback')) {
      const u = new URL(url, 'http://localhost');
      const code = u.searchParams.get('code');
      const err = u.searchParams.get('error');
      if (err) return send(res, 400, { error: err });
      if (!code) return send(res, 400, { error: 'missing code' });
      try {
        const tok = await exchangeCode(code);
        saveTokens(tok);
        res.statusCode = 302;
        res.setHeader('Location', '/music.html');
        res.end();
        return;
      } catch (e) {
        return send(res, 502, { error: 'token_exchange_failed', detail: String(e?.message || e) });
      }
    }

    if (url.startsWith('/api/spotify/oauth/status')) {
      const configured = isConfigured();
      const t = loadTokens();
      return send(res, 200, { configured, authenticated: !!t });
    }

    if (url.startsWith('/api/spotify/oauth/logout')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return send(res, 405, { error: 'POST only' });
      }
      clearTokens();
      return send(res, 200, { ok: true });
    }

    // ─── Generic proxy: /api/spotify/v1/... → api.spotify.com/v1/... ───
    if (url.startsWith('/api/spotify/v1/')) {
      let token;
      try { token = await getAccessToken(); }
      catch (e) { return send(res, 502, { error: 'refresh_failed', detail: String(e?.message || e) }); }
      if (!token) return send(res, 401, { error: 'not_authenticated' });

      const upstream = API_BASE + url.replace(/^\/api\/spotify/, '');
      const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      const ct = req.headers['content-type'];
      if (ct) headers['Content-Type'] = ct;

      let body;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        try { body = await readBody(req); }
        catch (e) { return send(res, 400, { error: 'body_read_failed', detail: String(e?.message || e) }); }
        if (body && body.length === 0) body = undefined;
      }

      // Spotify's /me/player/* endpoints sometimes 502/503 on transient
      // upstream hiccups. Retry once with a short backoff so a single bad
      // poll doesn't surface as a UI error.
      const doFetch = () => fetch(upstream, { method: req.method, headers, body });
      try {
        let r = await doFetch();
        if ((r.status === 502 || r.status === 503 || r.status === 504) && (req.method === 'GET' || req.method === 'HEAD')) {
          await new Promise(rs => setTimeout(rs, 400));
          r = await doFetch();
        }
        res.statusCode = r.status;
        const respCt = r.headers.get('content-type');
        if (respCt) res.setHeader('Content-Type', respCt);
        const buf = Buffer.from(await r.arrayBuffer());
        res.end(buf);
      } catch (e) {
        return send(res, 502, { error: 'spotify_upstream_error', detail: String(e?.message || e) });
      }
      return;
    }

    return send(res, 404, { error: 'unknown spotify route' });
  };
}

export function spotifyOAuthPlugin() {
  return {
    name: 'spotify-oauth',
    configureServer(s)        { s.middlewares.use(spotifyOAuthMiddleware()); },
    configurePreviewServer(s) { s.middlewares.use(spotifyOAuthMiddleware()); },
  };
}
