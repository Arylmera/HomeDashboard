/* ============================================================== *
 *  Prefs API — tiny SQLite-backed key/value store.
 *
 *  Mounted as Vite middleware in both `dev` and `preview` modes
 *  (see vite.config.js). Persists to $PREFS_DB (default /data/prefs.db).
 *
 *  Endpoints:
 *    GET  /api/prefs/:key  →  { value: <json> | null }
 *    PUT  /api/prefs/:key  →  body { value: <json> }   stores & returns it
 * ============================================================== */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

let db = null;

function open() {
  if (db) return db;
  const path = process.env.PREFS_DB || '/data/prefs.db';
  try { mkdirSync(dirname(path), { recursive: true }); } catch {}
  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS prefs (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  return db;
}

const KEY_RE = /^[a-zA-Z0-9_:.-]{1,64}$/;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 1024 * 64) reject(new Error('body too large')); });
    req.on('end', () => resolve(s));
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

export function prefsMiddleware() {
  return async (req, res, next) => {
    const m = req.url && req.url.match(/^\/api\/prefs\/([^/?#]+)/);
    if (!m) return next();
    const key = decodeURIComponent(m[1]);
    if (!KEY_RE.test(key)) return send(res, 400, { error: 'invalid key' });

    const d = open();
    try {
      if (req.method === 'GET') {
        const row = d.prepare('SELECT value FROM prefs WHERE key = ?').get(key);
        return send(res, 200, { value: row ? JSON.parse(row.value) : null });
      }
      if (req.method === 'PUT') {
        const raw = await readBody(req);
        let parsed;
        try { parsed = JSON.parse(raw); } catch { return send(res, 400, { error: 'invalid json' }); }
        if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) {
          return send(res, 400, { error: 'expected { value: ... }' });
        }
        d.prepare('INSERT INTO prefs(key, value, updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')
          .run(key, JSON.stringify(parsed.value), Date.now());
        return send(res, 200, { value: parsed.value });
      }
      res.setHeader('Allow', 'GET, PUT');
      return send(res, 405, { error: 'method not allowed' });
    } catch (e) {
      return send(res, 500, { error: String(e?.message || e) });
    }
  };
}

export function prefsPlugin() {
  return {
    name: 'prefs-api',
    configureServer(server)        { server.middlewares.use(prefsMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(prefsMiddleware()); },
  };
}
