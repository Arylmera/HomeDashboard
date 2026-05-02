/* ============================================================== *
 *  Asuswrt router — SSH backend (ssh2 npm lib).
 *
 *  Connects with password OR private key, runs one batched shell
 *  command, parses marker-delimited sections.
 *
 *  Env:
 *    VITE_ASUS_URL    public URL for the "open router" link
 *    ASUS_SSH_HOST    host (defaults to host of VITE_ASUS_URL)
 *    ASUS_SSH_PORT    SSH port (default 1024)
 *    ASUS_USERNAME    SSH user (case-sensitive — usually "Admin")
 *    ASUS_PASSWORD    password (omit if using key auth)
 *    ASUS_SSH_KEY     path to private key (omit if using password)
 * ============================================================== */

import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';

const TTL_MS = 15_000;
const TIMEOUT_MS = 10_000;

let cached = null;     // { ts, payload }
let inflight = null;
let backoffUntil = 0;

function hostFromUrl() {
  const u = (process.env.VITE_ASUS_URL || '').trim();
  if (!u) return '';
  try { return new URL(u.match(/^https?:\/\//i) ? u : `http://${u}`).hostname; }
  catch { return u.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''); }
}

function cfg() {
  return {
    host: process.env.ASUS_SSH_HOST || hostFromUrl(),
    port: Number(process.env.ASUS_SSH_PORT || 1024),
    user: process.env.ASUS_USERNAME || 'Admin',
    password: process.env.ASUS_PASSWORD || '',
    keyPath: process.env.ASUS_SSH_KEY || '',
  };
}
function configured() {
  const c = cfg();
  return !!(c.host && (c.password || c.keyPath));
}

const REMOTE = `
echo '##model'; nvram get productid
echo '##firmver'; nvram get firmver
echo '##buildno'; nvram get buildno
echo '##extendno'; nvram get extendno
echo '##wan_state'; nvram get wan0_state_t
echo '##wan_proto'; nvram get wan0_proto
echo '##wan_ip'; nvram get wan0_ipaddr
echo '##wan_gw'; nvram get wan0_gateway
echo '##wan_dns'; nvram get wan0_dns
echo '##uptime'; cat /proc/uptime
echo '##loadavg'; cat /proc/loadavg
echo '##meminfo'; cat /proc/meminfo
echo '##stat1'; head -n 1 /proc/stat; sleep 1
echo '##stat2'; head -n 1 /proc/stat
echo '##arp'; cat /proc/net/arp 2>/dev/null
echo '##end'
`.trim();

function runSsh() {
  const c = cfg();
  const opts = {
    host: c.host,
    port: c.port,
    username: c.user,
    readyTimeout: TIMEOUT_MS,
    // Asuswrt uses an old SSH stack — broaden the algorithm allowlist.
    algorithms: {
      kex: [
        'curve25519-sha256', 'curve25519-sha256@libssh.org',
        'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521',
        'diffie-hellman-group-exchange-sha256',
        'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1',
        'diffie-hellman-group1-sha1',
      ],
      serverHostKey: [
        'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384',
        'ecdsa-sha2-nistp521', 'rsa-sha2-512', 'rsa-sha2-256',
        'ssh-rsa', 'ssh-dss',
      ],
      cipher: [
        'aes128-gcm@openssh.com', 'aes256-gcm@openssh.com',
        'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
        'aes128-cbc', 'aes256-cbc', '3des-cbc',
      ],
      hmac: [
        'hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-md5',
      ],
    },
  };
  if (c.password) {
    opts.password = c.password;
    opts.tryKeyboard = true;
  }
  if (c.keyPath) {
    try { opts.privateKey = readFileSync(c.keyPath); }
    catch (e) { return Promise.reject(new Error(`asus: cannot read ASUS_SSH_KEY: ${e.message}`)); }
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '', stderr = '';
    const timer = setTimeout(() => {
      try { conn.end(); } catch {}
      reject(new Error(`asus ssh timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS + 2000);

    conn.on('ready', () => {
      conn.exec(REMOTE, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); return reject(err); }
        stream.on('data', (b) => { stdout += b.toString(); });
        stream.stderr.on('data', (b) => { stderr += b.toString(); });
        stream.on('close', (code) => {
          clearTimeout(timer);
          conn.end();
          if (code !== 0) {
            return reject(new Error(`asus ssh exit ${code}: ${stderr.trim().slice(0, 200)}`));
          }
          resolve(stdout);
        });
      });
    });
    conn.on('keyboard-interactive', (_n, _i, _l, _prompts, finish) => {
      finish([c.password]);
    });
    conn.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`asus ssh: ${err.message}`));
    });
    conn.connect(opts);
  });
}

/* ── parsing ────────────────────────────────────────────────── */

function splitSections(out) {
  const sections = {};
  for (const p of out.split(/^##/m)) {
    if (!p) continue;
    const nl = p.indexOf('\n');
    if (nl < 0) continue;
    sections[p.slice(0, nl).trim()] = p.slice(nl + 1).trim();
  }
  return sections;
}
function parseUptime(body) {
  const n = parseFloat((body || '').split(/\s+/)[0]);
  return Number.isFinite(n) ? Math.round(n) : null;
}
function parseLoadavg(body) {
  const m = (body || '').match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
function parseMeminfo(body) {
  const get = (k) => {
    const m = (body || '').match(new RegExp(`^${k}:\\s+(\\d+)\\s+kB`, 'm'));
    return m ? +m[1] : null;
  };
  const total = get('MemTotal');
  const free = get('MemFree');
  const avail = get('MemAvailable');
  if (!total) return null;
  const used = avail != null ? total - avail : (free != null ? total - free : null);
  return {
    totalKb: total,
    usedKb: used,
    pct: used != null ? +((used / total) * 100).toFixed(1) : null,
  };
}
function parseCpuLine(line) {
  const parts = (line || '').split(/\s+/).slice(1).map(Number).filter(Number.isFinite);
  if (parts.length < 4) return null;
  const idle = parts[3] + (parts[4] || 0);
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}
function cpuPct(stat1, stat2) {
  const a = parseCpuLine(stat1), b = parseCpuLine(stat2);
  if (!a || !b) return null;
  const dTotal = b.total - a.total, dIdle = b.idle - a.idle;
  if (dTotal <= 0) return null;
  return +(((dTotal - dIdle) / dTotal) * 100).toFixed(1);
}
function parseArp(body) {
  const lines = (body || '').split('\n').slice(1).filter(Boolean);
  let total = 0, online = 0, wired = 0, wireless = 0;
  for (const ln of lines) {
    const cols = ln.trim().split(/\s+/);
    if (cols.length < 6) continue;
    const flags = cols[2], mac = cols[3], dev = cols[5];
    if (mac === '00:00:00:00:00:00') continue;
    total++;
    if (flags !== '0x0') online++;
    if (/^(eth|vlan|br)/i.test(dev)) wired++;
    else if (/^(wl|ra|wifi)/i.test(dev)) wireless++;
  }
  return { total, online, wired, wireless };
}
function parseWan(s) {
  return {
    up: s['wan_state'] === '2',
    type: s['wan_proto'] || null,
    ip: s['wan_ip'] || null,
    gateway: s['wan_gw'] || null,
    dns: s['wan_dns'] || null,
  };
}
function buildPayload(out) {
  const s = splitSections(out);
  const fw = [s['firmver'], s['buildno'], s['extendno']].filter(Boolean).join('.');
  return {
    model: s['model'] || null,
    firmware: fw || null,
    uptime: { seconds: parseUptime(s['uptime']), load: parseLoadavg(s['loadavg']) },
    wan: parseWan(s),
    wanIp: s['wan_ip'] || null,
    cpu: cpuPct(s['stat1'], s['stat2']),
    mem: parseMeminfo(s['meminfo']),
    clients: parseArp(s['arp']),
  };
}

/* ── cache + middleware ─────────────────────────────────────── */

async function fetchStatus() {
  if (Date.now() < backoffUntil) {
    const wait = Math.ceil((backoffUntil - Date.now()) / 1000);
    throw new Error(`asus ssh backoff: retry in ${wait}s`);
  }
  try { return buildPayload(await runSsh()); }
  catch (e) { backoffUntil = Date.now() + 60_000; throw e; }
}

async function getCached() {
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.payload;
  if (inflight) return inflight;
  inflight = (async () => {
    const payload = await fetchStatus();
    cached = { ts: Date.now(), payload };
    inflight = null;
    return payload;
  })();
  try { return await inflight; } catch (e) { inflight = null; throw e; }
}

export function asusMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/asus/')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (!configured()) return res.end(JSON.stringify({ state: 'idle' }));
    const path = req.url.replace(/^\/api\/asus\//, '').replace(/\?.*$/, '');
    try {
      if (path === 'status' || path === 'status/') {
        const data = await getCached();
        return res.end(JSON.stringify({ state: 'live', ...data }));
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (e) {
      const msg = String(e?.message || e);
      console.error('[asus]', req.url, '→', msg);
      res.statusCode = 502;
      res.end(JSON.stringify({ state: 'error', error: msg }));
    }
  };
}

export function asusPlugin() {
  return {
    name: 'asus-router',
    configureServer(server)        { server.middlewares.use(asusMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(asusMiddleware()); },
  };
}
