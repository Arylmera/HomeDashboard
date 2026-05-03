/* ============================================================== *
 *  Homey OAuth2 — server-side flow using the official `homey-api`
 *  SDK. The SDK does the OAuth exchange, the JWT delegation needed
 *  to call /api/manager/* on a Homey, and auto-refreshes tokens.
 *
 *  Endpoints:
 *    GET  /api/homey/oauth/login    → 302 to athom.com authorize
 *    GET  /api/homey/oauth/callback → SDK exchanges code, persists token
 *    GET  /api/homey/oauth/status   → { authenticated, configured }
 *    POST /api/homey/oauth/logout   → clears persisted state
 *    GET  /api/homey/snapshot       → live { system, zones, devices, flows }
 *
 *  Token state persists in $PREFS_DB (same SQLite as prefs.js) under
 *  key `homey:cloud_state`. SDK manages the contents.
 * ============================================================== */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AthomCloudAPI } from 'homey-api';

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
const STATE_KEY = 'homey:cloud_state';

class SqliteStorageAdapter extends AthomCloudAPI.StorageAdapter {
  async get() {
    const row = open().prepare('SELECT value FROM prefs WHERE key = ?').get(STATE_KEY);
    return row ? JSON.parse(row.value) : {};
  }
  async set(value) {
    open().prepare(
      'INSERT INTO prefs(key,value,updated_at) VALUES(?,?,?) ' +
      'ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
    ).run(STATE_KEY, JSON.stringify(value || {}), Date.now());
  }
}
function clearState() {
  open().prepare('DELETE FROM prefs WHERE key = ?').run(STATE_KEY);
}

// ─── Lazy AthomCloudAPI instance ──────────────────────────────
let cloudApi = null;
function getCloudApi() {
  if (cloudApi) return cloudApi;
  const opts = {
    clientId: process.env.HOMEY_CLIENT_ID,
    clientSecret: process.env.HOMEY_CLIENT_SECRET,
    redirectUrl: process.env.HOMEY_REDIRECT_URI,
    store: new SqliteStorageAdapter(),
    autoRefreshTokens: true,
  };
  if (!opts.clientId || !opts.clientSecret || !opts.redirectUrl) return null;
  cloudApi = new AthomCloudAPI(opts);
  return cloudApi;
}
function isConfigured() {
  return !!(process.env.HOMEY_CLIENT_ID && process.env.HOMEY_CLIENT_SECRET && process.env.HOMEY_REDIRECT_URI);
}

// ─── Cache the per-Homey session (~30 min) ────────────────────
let homeyApiCache = null;
let homeyApiCachedAt = 0;
const HOMEY_API_TTL = 30 * 60 * 1000;

async function getHomeyApi() {
  if (homeyApiCache && Date.now() - homeyApiCachedAt < HOMEY_API_TTL) return homeyApiCache;
  const api = getCloudApi();
  if (!api) return null;
  if (!await api.isLoggedIn()) return null;

  const user = await api.getAuthenticatedUser();
  let homey;
  if (process.env.HOMEY_ID && typeof user.getHomeyById === 'function') {
    try { homey = await user.getHomeyById({ id: process.env.HOMEY_ID }); }
    catch { homey = null; }
  }
  if (!homey) homey = await user.getFirstHomey();
  homeyApiCache = await homey.authenticate();
  homeyApiCachedAt = Date.now();
  return homeyApiCache;
}

function invalidateHomeyApi() { homeyApiCache = null; homeyApiCachedAt = 0; }

// ─── HTTP helpers ─────────────────────────────────────────────
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Capabilities the dashboard is allowed to write. Anything else is rejected
// to avoid accidentally writing sensor/measurement values.
const WRITABLE_CAPS = new Set(['onoff', 'dim', 'target_temperature']);

const VARIABLE_TYPES = new Set(['boolean', 'number', 'string']);

// ─── Snapshot serializer (trim SDK objects to plain JSON) ─────
function serializeSnapshot({ system, zones, devices, flows, advFlows, folders, variables }) {
  return {
    system: system && {
      hostname: system.hostname,
      homeyVersion: system.homeyVersion,
      homeyModelName: system.homeyModelName,
      uptime: system.uptime,
      cpuUsage: system.cpuUsage,
      memTotal: system.memTotal,
      memFree: system.memFree,
      wifiSsid: system.wifiSsid,
    },
    zones: Object.values(zones || {}).map(z => ({
      id: z.id, name: z.name, parent: z.parent, active: z.active,
    })),
    devices: Object.values(devices || {}).map(d => {
      const c = d.capabilitiesObj || {};
      return {
        id: d.id, name: d.name, zone: d.zone, class: d.class,
        available: d.available, ready: d.ready,
        capabilities: d.capabilities,
        values: {
          onoff:                c.onoff?.value ?? null,
          dim:                  c.dim?.value ?? null,
          measure_power:        c.measure_power?.value ?? null,
          meter_power:          c.meter_power?.value ?? null,
          measure_temperature:  c.measure_temperature?.value ?? null,
          measure_humidity:     c.measure_humidity?.value ?? null,
          measure_battery:      c.measure_battery?.value ?? null,
          target_temperature:   c.target_temperature?.value ?? null,
          alarm_motion:         c.alarm_motion?.value ?? null,
          alarm_contact:        c.alarm_contact?.value ?? null,
          light_temperature:    c.light_temperature?.value ?? null,
          light_hue:            c.light_hue?.value ?? null,
          light_saturation:     c.light_saturation?.value ?? null,
        },
      };
    }),
    flows: [
      ...Object.values(flows || {}).map(f => ({
        id: f.id, name: f.name, enabled: f.enabled, broken: f.broken, type: 'flow',
        folder: f.folder ?? null,
      })),
      ...Object.values(advFlows || {}).map(f => ({
        id: f.id, name: f.name, enabled: f.enabled, broken: f.broken, type: 'advancedflow',
        folder: f.folder ?? null,
      })),
    ],
    folders: Object.values(folders || {}).map(f => ({
      id: f.id, name: f.name, parent: f.parent ?? null,
    })),
    variables: Object.values(variables || {}).map(v => ({
      id: v.id, name: v.name, type: v.type, value: v.value,
    })),
  };
}

// ─── Middleware ───────────────────────────────────────────────
export function homeyOAuthMiddleware() {
  return async (req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/api/homey/') && url !== '/api/homey') return next();

    // ─── /api/homey/oauth/login ───────────────────────────────
    if (url.startsWith('/api/homey/oauth/login')) {
      if (!isConfigured()) {
        return send(res, 500, { error: 'HOMEY_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI not set' });
      }
      const api = getCloudApi();
      res.statusCode = 302;
      res.setHeader('Location', api.getLoginUrl());
      res.end();
      return;
    }

    // ─── /api/homey/oauth/callback ────────────────────────────
    if (url.startsWith('/api/homey/oauth/callback')) {
      const u = new URL(url, 'http://localhost');
      const code = u.searchParams.get('code');
      const err = u.searchParams.get('error');
      if (err) return send(res, 400, { error: err, description: u.searchParams.get('error_description') });
      if (!code) return send(res, 400, { error: 'missing code' });
      try {
        const api = getCloudApi();
        await api.authenticateWithAuthorizationCode({ code, removeCodeFromHistory: false });
        invalidateHomeyApi();
        res.statusCode = 302;
        res.setHeader('Location', '/homey.html');
        res.end();
        return;
      } catch (e) {
        return send(res, 502, { error: 'token exchange failed', detail: String(e?.message || e) });
      }
    }

    // ─── /api/homey/oauth/status ──────────────────────────────
    if (url.startsWith('/api/homey/oauth/status')) {
      const configured = isConfigured();
      let authenticated = false;
      try {
        const api = getCloudApi();
        if (api) authenticated = await api.isLoggedIn();
      } catch {}
      return send(res, 200, { configured, authenticated });
    }

    // ─── /api/homey/oauth/logout ──────────────────────────────
    if (url.startsWith('/api/homey/oauth/logout')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return send(res, 405, { error: 'POST only' });
      }
      clearState();
      cloudApi = null;
      invalidateHomeyApi();
      return send(res, 200, { ok: true });
    }

    // ─── /api/homey/device/:id/capability/:cap ────────────────
    {
      const m = url.match(/^\/api\/homey\/device\/([^/?]+)\/capability\/([^/?]+)(?:\?.*)?$/);
      if (m) {
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          return send(res, 405, { error: 'POST only' });
        }
        const deviceId = decodeURIComponent(m[1]);
        const capabilityId = decodeURIComponent(m[2]);
        if (!WRITABLE_CAPS.has(capabilityId)) {
          return send(res, 400, { error: 'capability_not_writable', capability: capabilityId });
        }
        let body;
        try { body = await readJsonBody(req); }
        catch { return send(res, 400, { error: 'invalid_json' }); }
        if (!('value' in body)) return send(res, 400, { error: 'missing_value' });
        try {
          const homeyApi = await getHomeyApi();
          if (!homeyApi) return send(res, 401, { error: 'not_authenticated' });
          await homeyApi.devices.setCapabilityValue({ deviceId, capabilityId, value: body.value });
          return send(res, 200, { ok: true });
        } catch (e) {
          invalidateHomeyApi();
          return send(res, 502, { error: 'homey_api_error', detail: String(e?.message || e) });
        }
      }
    }

    // ─── /api/homey/flow/:id/trigger ──────────────────────────
    {
      const m = url.match(/^\/api\/homey\/flow\/([^/?]+)\/trigger(?:\?.*)?$/);
      if (m) {
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          return send(res, 405, { error: 'POST only' });
        }
        const id = decodeURIComponent(m[1]);
        let body = {};
        try { body = await readJsonBody(req); }
        catch { return send(res, 400, { error: 'invalid_json' }); }
        const type = body.type === 'advancedflow' ? 'advancedflow' : 'flow';
        try {
          const homeyApi = await getHomeyApi();
          if (!homeyApi) return send(res, 401, { error: 'not_authenticated' });
          if (type === 'advancedflow' && typeof homeyApi.flow.triggerAdvancedFlow === 'function') {
            await homeyApi.flow.triggerAdvancedFlow({ id });
          } else {
            await homeyApi.flow.triggerFlow({ id });
          }
          return send(res, 200, { ok: true });
        } catch (e) {
          invalidateHomeyApi();
          return send(res, 502, { error: 'homey_api_error', detail: String(e?.message || e) });
        }
      }
    }

    // ─── /api/homey/variable/:id ──────────────────────────────
    {
      const m = url.match(/^\/api\/homey\/variable\/([^/?]+)(?:\?.*)?$/);
      if (m) {
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          return send(res, 405, { error: 'POST only' });
        }
        const id = decodeURIComponent(m[1]);
        let body;
        try { body = await readJsonBody(req); }
        catch { return send(res, 400, { error: 'invalid_json' }); }
        if (!('value' in body)) return send(res, 400, { error: 'missing_value' });
        const t = typeof body.value;
        if (!VARIABLE_TYPES.has(t)) {
          return send(res, 400, { error: 'invalid_value', type: t });
        }
        try {
          const homeyApi = await getHomeyApi();
          if (!homeyApi) return send(res, 401, { error: 'not_authenticated' });
          await homeyApi.logic.setVariableValue({ id, variable: { value: body.value } });
          return send(res, 200, { ok: true });
        } catch (e) {
          invalidateHomeyApi();
          return send(res, 502, { error: 'homey_api_error', detail: String(e?.message || e) });
        }
      }
    }

    // ─── /api/homey/snapshot ──────────────────────────────────
    if (url.startsWith('/api/homey/snapshot')) {
      try {
        const homeyApi = await getHomeyApi();
        if (!homeyApi) return send(res, 401, { error: 'not_authenticated' });
        const [system, zones, devices, flows, advFlows, folders, variables] = await Promise.all([
          homeyApi.system?.getInfo?.()  .catch(() => null),
          homeyApi.zones.getZones()     .catch(() => ({})),
          homeyApi.devices.getDevices() .catch(() => ({})),
          homeyApi.flow?.getFlows?.()   .catch(() => ({})),
          homeyApi.flow?.getAdvancedFlows?.().catch(() => ({})),
          homeyApi.flow?.getFlowFolders?.().catch(() => ({})),
          homeyApi.logic?.getVariables?.().catch(() => ({})),
        ]);
        return send(res, 200, serializeSnapshot({ system, zones, devices, flows, advFlows, folders, variables }));
      } catch (e) {
        invalidateHomeyApi();
        return send(res, 502, { error: 'homey_api_error', detail: String(e?.message || e) });
      }
    }

    return send(res, 404, { error: 'unknown homey route' });
  };
}

export function homeyOAuthPlugin() {
  return {
    name: 'homey-oauth',
    configureServer(s)        { s.middlewares.use(homeyOAuthMiddleware()); },
    configurePreviewServer(s) { s.middlewares.use(homeyOAuthMiddleware()); },
  };
}
