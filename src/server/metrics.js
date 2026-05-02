/* ============================================================== *
 *  Metrics API — server-side ring buffer for NAS dashboard.
 *
 *  Polls Glances every TICK_MS, persists samples to a SQLite ring
 *  buffer (24 h retention), serves them back to the client so the
 *  NAS page can seed its sparklines instantly instead of waiting
 *  for fresh ticks to arrive.
 *
 *  Mounted as Vite middleware in dev + preview (see vite.config.js).
 *  Persists to $METRICS_DB (default /data/metrics.db).
 *
 *  Endpoint:
 *    GET /api/metrics?since=<unixMs>  →  { [series]: [[ts, v], ...] }
 *      defaults to last 10 min if `since` is omitted.
 *
 *  Series:
 *    mem.used, net.rx, net.tx, cpu.temp.avg, cpu.temp.<i>,
 *    speedtest.down, speedtest.up, speedtest.ping, speedtest.loss
 * ============================================================== */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TICK_MS       = 5_000;
const SPEEDTEST_TICK_MS = 5 * 60 * 1000;     // poll latest every 5 min (results change ~hourly)
const PRUNE_MS      = 60_000;
const RETENTION_MS  = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT = 4_000;
const DEFAULT_LOOKBACK_MS = 10 * 60 * 1000;

let db = null;
let started = false;
let insertMany = null;
let pruneStmt = null;
let selectSince = null;

function open() {
  if (db) return db;
  const path = process.env.METRICS_DB || '/data/metrics.db';
  try { mkdirSync(dirname(path), { recursive: true }); } catch {}
  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS metric (
      ts     INTEGER NOT NULL,
      series TEXT    NOT NULL,
      value  REAL    NOT NULL,
      PRIMARY KEY (series, ts)
    ) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS idx_metric_ts ON metric(ts);
  `);
  const ins = db.prepare('INSERT OR REPLACE INTO metric (ts, series, value) VALUES (?, ?, ?)');
  insertMany = db.transaction((rows) => { for (const r of rows) ins.run(r.ts, r.series, r.value); });
  pruneStmt = db.prepare('DELETE FROM metric WHERE ts < ?');
  selectSince = db.prepare('SELECT ts, series, value FROM metric WHERE ts >= ? ORDER BY ts ASC');
  return db;
}

async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Heuristic: speedtest-tracker returns bytes/sec when "use bits" is off.
// Values > 10000 are raw bytes/sec; otherwise already Mbps.
function bpsToMbps(v) {
  if (v == null) return null;
  const n = +v;
  if (!Number.isFinite(n)) return null;
  return n > 10000 ? +(n * 8 / 1e6).toFixed(2) : +n.toFixed(2);
}

async function collectSpeedtest() {
  const base = (process.env.VITE_SPEEDTEST_URL || '').replace(/\/+$/, '');
  if (!base) return [];
  const token = process.env.SPEEDTEST_API_KEY || '';
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const j = await fetchJson(`${base}/api/speedtest/latest`, { headers });
  const d = j?.data || j;
  if (!d) return [];
  const tsRaw = d.created_at || d.timestamp;
  const ts = tsRaw ? new Date(tsRaw).getTime() : Date.now();
  if (!Number.isFinite(ts)) return [];
  const rows = [];
  const down = bpsToMbps(d.download ?? d.download_speed);
  const up   = bpsToMbps(d.upload ?? d.upload_speed);
  const ping = d.ping != null ? +(+d.ping).toFixed(2) : null;
  const loss = d.packet_loss != null ? +(+d.packet_loss).toFixed(2) : null;
  if (down != null) rows.push({ ts, series: 'speedtest.down', value: down });
  if (up   != null) rows.push({ ts, series: 'speedtest.up',   value: up });
  if (ping != null) rows.push({ ts, series: 'speedtest.ping', value: ping });
  if (loss != null) rows.push({ ts, series: 'speedtest.loss', value: loss });
  return rows;
}

async function speedtestTick() {
  try {
    const rows = await collectSpeedtest();
    if (rows.length) insertMany(rows);   // PRIMARY KEY (series, ts) dedupes
  } catch (e) {
    console.warn('[metrics] speedtest tick failed:', e?.message || e);
  }
}

async function collect() {
  const base = (process.env.VITE_GLANCES_URL || '').replace(/\/+$/, '');
  if (!base) return [];
  const [mem, net, sensors, percpu] = await Promise.all([
    fetchJson(`${base}/api/4/mem`),
    fetchJson(`${base}/api/4/network`),
    fetchJson(`${base}/api/4/sensors`),
    fetchJson(`${base}/api/4/percpu`),
  ]);

  const ts = Date.now();
  const rows = [];

  if (mem && mem.used != null) rows.push({ ts, series: 'mem.used', value: +mem.used });

  if (Array.isArray(net) && net.length) {
    const iface = net.find(n => n.interface_name === 'eno1' || n.interface_name === 'eth0') || net[0];
    if (iface) {
      const rx = iface.bytes_recv_rate_per_sec ?? iface.rx;
      const tx = iface.bytes_sent_rate_per_sec ?? iface.tx;
      if (rx != null) rows.push({ ts, series: 'net.rx', value: +rx });
      if (tx != null) rows.push({ ts, series: 'net.tx', value: +tx });
    }
  }

  if (Array.isArray(sensors) && Array.isArray(percpu)) {
    const coreCount = Math.min(8, percpu.length || 0);
    const temps = [];
    for (let i = 0; i < coreCount; i++) {
      const entry = sensors.find(s =>
        s.label === `Core ${i}` || s.label === `Package id ${i}` ||
        s.label === `cpu${i}`   || s.label === `Core${i}`
      );
      if (entry?.value != null) {
        rows.push({ ts, series: `cpu.temp.${i}`, value: +entry.value });
        temps.push(+entry.value);
      }
    }
    if (temps.length) {
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      rows.push({ ts, series: 'cpu.temp.avg', value: avg });
    }
  }

  return rows;
}

async function tick() {
  try {
    const rows = await collect();
    if (rows.length) insertMany(rows);
  } catch (e) {
    console.warn('[metrics] tick failed:', e?.message || e);
  }
}

function prune() {
  try { pruneStmt.run(Date.now() - RETENTION_MS); }
  catch (e) { console.warn('[metrics] prune failed:', e?.message || e); }
}

function start() {
  if (started) return;
  started = true;
  open();
  tick();
  speedtestTick();
  setInterval(tick, TICK_MS);
  setInterval(speedtestTick, SPEEDTEST_TICK_MS);
  setInterval(prune, PRUNE_MS);
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export function metricsMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/metrics')) return next();
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return send(res, 405, { error: 'method not allowed' });
    }
    try {
      open();
      const url = new URL(req.url, 'http://localhost');
      const sinceParam = url.searchParams.get('since');
      const since = sinceParam ? Math.max(0, +sinceParam) : Date.now() - DEFAULT_LOOKBACK_MS;
      const rows = selectSince.all(since);
      const out = {};
      for (const r of rows) {
        (out[r.series] ||= []).push([r.ts, r.value]);
      }
      return send(res, 200, out);
    } catch (e) {
      return send(res, 500, { error: String(e?.message || e) });
    }
  };
}

export function metricsPlugin() {
  return {
    name: 'metrics-api',
    configureServer(server)        { start(); server.middlewares.use(metricsMiddleware()); },
    configurePreviewServer(server) { start(); server.middlewares.use(metricsMiddleware()); },
  };
}
