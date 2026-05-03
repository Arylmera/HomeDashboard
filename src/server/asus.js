/* ============================================================== *
 *  Asuswrt router — SSH backend (ssh2 npm lib).
 *
 *  Connects with password OR private key, runs one batched shell
 *  command, parses marker-delimited sections.
 *
 *  Two SSH targets are supported:
 *    main → primary AiMesh router (also exposes the mesh node list
 *           parsed from `nvram get cfg_clientlist`)
 *    node → optional AiMesh node, queried over its own SSH session
 *
 *  Env (main):
 *    VITE_ASUS_URL    public URL for the "open router" link
 *    ASUS_SSH_HOST    host (defaults to host of VITE_ASUS_URL)
 *    ASUS_SSH_PORT    SSH port (default 1024)
 *    ASUS_USERNAME    SSH user (case-sensitive — usually "Admin")
 *    ASUS_PASSWORD    password (omit if using key auth)
 *    ASUS_SSH_KEY     path to private key (omit if using password)
 *
 *  Env (AiMesh node — all optional, falls back to main creds where blank):
 *    ASUS_NODE_SSH_HOST   node LAN IP/hostname
 *    ASUS_NODE_SSH_PORT   default 1024
 *    ASUS_NODE_USERNAME   default same as ASUS_USERNAME
 *    ASUS_NODE_PASSWORD   default same as ASUS_PASSWORD
 *    ASUS_NODE_SSH_KEY    default same as ASUS_SSH_KEY
 * ============================================================== */

import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';

const TTL_MS = 15_000;
const TIMEOUT_MS = 10_000;

const cache = { main: null, node: null };
const inflight = { main: null, node: null };
const backoffUntil = { main: 0, node: 0 };

function hostFromUrl() {
  const u = (process.env.VITE_ASUS_URL || '').trim();
  if (!u) return '';
  try { return new URL(u.match(/^https?:\/\//i) ? u : `http://${u}`).hostname; }
  catch { return u.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''); }
}

function cfgMain() {
  return {
    host: process.env.ASUS_SSH_HOST || hostFromUrl(),
    port: Number(process.env.ASUS_SSH_PORT || 1024),
    user: process.env.ASUS_USERNAME || 'Admin',
    password: process.env.ASUS_PASSWORD || '',
    keyPath: process.env.ASUS_SSH_KEY || '',
  };
}
function cfgNode() {
  const m = cfgMain();
  return {
    host: process.env.ASUS_NODE_SSH_HOST || '',
    port: Number(process.env.ASUS_NODE_SSH_PORT || m.port || 1024),
    user: process.env.ASUS_NODE_USERNAME || m.user,
    password: process.env.ASUS_NODE_PASSWORD || m.password,
    keyPath: process.env.ASUS_NODE_SSH_KEY || m.keyPath,
  };
}
function cfg(target) { return target === 'node' ? cfgNode() : cfgMain(); }
function configured(target) {
  const c = cfg(target);
  return !!(c.host && (c.password || c.keyPath));
}

const REMOTE_BASE = `
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
`.trim();

const REMOTE_MAIN = `${REMOTE_BASE}
echo '##cfg_clientlist'; nvram get cfg_clientlist
echo '##cfg_device_list'; nvram get cfg_device_list
echo '##end'`;

const REMOTE_NODE = `${REMOTE_BASE}
echo '##cfg_local'; nvram get cfg_local
echo '##end'`;

function runSsh(target) {
  const c = cfg(target);
  const remote = target === 'node' ? REMOTE_NODE : REMOTE_MAIN;
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
    catch (e) { return Promise.reject(new Error(`asus: cannot read key: ${e.message}`)); }
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '', stderr = '';
    const timer = setTimeout(() => {
      try { conn.end(); } catch {}
      reject(new Error(`asus ssh timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS + 2000);

    conn.on('ready', () => {
      conn.exec(remote, (err, stream) => {
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
/* Exported for unit tests — keep pure (no I/O, no env access). */

export function splitSections(out) {
  const sections = {};
  for (const p of out.split(/^##/m)) {
    if (!p) continue;
    const nl = p.indexOf('\n');
    if (nl < 0) continue;
    sections[p.slice(0, nl).trim()] = p.slice(nl + 1).trim();
  }
  return sections;
}
export function parseUptime(body) {
  const n = parseFloat((body || '').split(/\s+/)[0]);
  return Number.isFinite(n) ? Math.round(n) : null;
}
export function parseLoadavg(body) {
  const m = (body || '').match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
export function parseMeminfo(body) {
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
export function parseCpuLine(line) {
  const parts = (line || '').split(/\s+/).slice(1).map(Number).filter(Number.isFinite);
  if (parts.length < 4) return null;
  const idle = parts[3] + (parts[4] || 0);
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}
export function cpuPct(stat1, stat2) {
  const a = parseCpuLine(stat1), b = parseCpuLine(stat2);
  if (!a || !b) return null;
  const dTotal = b.total - a.total, dIdle = b.idle - a.idle;
  if (dTotal <= 0) return null;
  return +(((dTotal - dIdle) / dTotal) * 100).toFixed(1);
}
export function parseArp(body) {
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
export function parseWan(s) {
  return {
    up: s['wan_state'] === '2',
    type: s['wan_proto'] || null,
    ip: s['wan_ip'] || null,
    gateway: s['wan_gw'] || null,
    dns: s['wan_dns'] || null,
  };
}

// cfg_clientlist format (Asuswrt-Merlin AiMesh):
//   <MODEL>MAC>FW>NEWFW>ONLINE>...   one entry per `<`
// First entry is the CAP (main router). Remaining entries are RE nodes.
export function parseMeshNodes(rawClients, rawDevices) {
  const out = [];
  const raw = (rawClients || '').trim();
  if (!raw) return out;
  const entries = raw.split('<').filter(Boolean);
  for (let i = 0; i < entries.length; i++) {
    const cols = entries[i].split('>');
    if (cols.length < 2) continue;
    const model = cols[0]?.trim() || null;
    const mac = (cols[1] || '').trim().toUpperCase();
    if (!/^[0-9A-F:]{11,}$/.test(mac)) continue;
    const fw = cols[2]?.trim() || null;
    const onlineFlag = (cols[4] ?? cols[3] ?? '').toString().trim();
    const online = onlineFlag === '1' || onlineFlag.toLowerCase() === 'online';
    out.push({
      role: i === 0 ? 'cap' : 're',
      model,
      mac,
      firmware: fw,
      online,
    });
  }
  // Try to enrich with IP from cfg_device_list (best-effort, optional).
  const dev = (rawDevices || '').trim();
  if (dev && out.length) {
    for (const node of out) {
      const ipMatch = dev.match(new RegExp(`${node.mac.replace(/:/g, ':?')}[^<>]*?(\\d+\\.\\d+\\.\\d+\\.\\d+)`, 'i'));
      if (ipMatch) node.ip = ipMatch[1];
    }
  }
  return out;
}

export function buildPayload(out, target) {
  const s = splitSections(out);
  const fw = [s['firmver'], s['buildno'], s['extendno']].filter(Boolean).join('.');
  const payload = {
    model: s['model'] || null,
    firmware: fw || null,
    uptime: { seconds: parseUptime(s['uptime']), load: parseLoadavg(s['loadavg']) },
    wan: parseWan(s),
    wanIp: s['wan_ip'] || null,
    cpu: cpuPct(s['stat1'], s['stat2']),
    mem: parseMeminfo(s['meminfo']),
    clients: parseArp(s['arp']),
  };
  if (target === 'main') {
    payload.mesh = parseMeshNodes(s['cfg_clientlist'], s['cfg_device_list']);
  }
  return payload;
}

/* ── cache + middleware ─────────────────────────────────────── */

async function fetchStatus(target) {
  if (Date.now() < backoffUntil[target]) {
    const wait = Math.ceil((backoffUntil[target] - Date.now()) / 1000);
    throw new Error(`asus ssh backoff: retry in ${wait}s`);
  }
  try { return buildPayload(await runSsh(target), target); }
  catch (e) { backoffUntil[target] = Date.now() + 60_000; throw e; }
}

async function getCached(target) {
  const c = cache[target];
  if (c && Date.now() - c.ts < TTL_MS) return c.payload;
  if (inflight[target]) return inflight[target];
  inflight[target] = (async () => {
    const payload = await fetchStatus(target);
    cache[target] = { ts: Date.now(), payload };
    inflight[target] = null;
    return payload;
  })();
  try { return await inflight[target]; } catch (e) { inflight[target] = null; throw e; }
}

export function asusMiddleware() {
  return async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/asus/')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    const path = req.url.replace(/^\/api\/asus\//, '').replace(/\?.*$/, '');

    // Route resolution
    let target = 'main';
    let kind = path.replace(/\/$/, '');
    if (kind.startsWith('node/')) { target = 'node'; kind = kind.slice(5); }
    else if (kind === 'node') { target = 'node'; kind = 'status'; }

    if (!configured(target)) return res.end(JSON.stringify({ state: 'idle' }));

    try {
      if (kind === 'status' || kind === '') {
        const data = await getCached(target);
        return res.end(JSON.stringify({ state: 'live', ...data }));
      }
      if (kind === 'mesh' && target === 'main') {
        const data = await getCached('main');
        return res.end(JSON.stringify({ state: 'live', mesh: data.mesh || [] }));
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
