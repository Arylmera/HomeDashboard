/* ============================================================== *
 *  Docker — shared formatting & label helpers.
 * ============================================================== */

export function stateClass(s) {
  if (s === 'running') return 'up';
  if (s === 'restarting' || s === 'paused') return 'warn';
  return 'down';
}

export function shortName(c) {
  const raw = c.names?.[0] || c.id?.slice(0, 12) || '?';
  return raw.replace(/^\//, '');
}

export function projectOf(c) {
  return c.labels?.['com.docker.compose.project'] || null;
}

export function serviceOf(c) {
  return c.labels?.['com.docker.compose.service'] || null;
}

// e.g. "Up 37 minutes (healthy)" → "37m · healthy"; "Exited (0) 2 hours ago" → "down 2h"
export function uptimeOf(c) {
  const s = c.status || '';
  const up = s.match(/^Up\s+(.+?)(?:\s+\((healthy|unhealthy|starting)\))?$/i);
  if (up) {
    const dur = up[1].replace(/about\s+/i, '').replace(/\sago/, '');
    const h = up[2];
    return h ? `${dur} · ${h}` : dur;
  }
  return s || '—';
}

export function uniqPorts(ports) {
  const seen = new Set();
  const out = [];
  for (const p of ports || []) {
    if (!p.publicPort) continue;
    const k = `${p.publicPort}->${p.privatePort}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

// collapse consecutive {publicPort, privatePort} into ranges:
// [{8080,80},{8081,81},{8082,82}] -> [{label:'8080-8082 ↦ 80-82', count:3}]
export function groupedPorts(ports) {
  const list = uniqPorts(ports).slice().sort((a, b) => a.publicPort - b.publicPort);
  const out = [];
  let run = null;
  for (const p of list) {
    const offset = p.publicPort - p.privatePort;
    if (run && p.publicPort === run.endPub + 1 && offset === run.offset) {
      run.endPub = p.publicPort;
      run.endPriv = p.privatePort;
      run.count++;
    } else {
      if (run) out.push(run);
      run = {
        startPub: p.publicPort, endPub: p.publicPort,
        startPriv: p.privatePort, endPriv: p.privatePort,
        offset, count: 1,
      };
    }
  }
  if (run) out.push(run);
  return out.map(r => ({
    label: r.count === 1
      ? `${r.startPub}`
      : `${r.startPub}-${r.endPub}`,
    target: r.count === 1
      ? `${r.startPriv}`
      : `${r.startPriv}-${r.endPriv}`,
    count: r.count,
  }));
}

// stable hash → hue for stack color stripe
export function stackHue(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

// classify stack health for sort + display
// variant 'ix' (TrueNAS apps): any-up counts as healthy, since these
// stacks bundle a main container with sidecars/init helpers that idle.
export function stackHealth(services, variant) {
  const total = services.length;
  const up = services.filter(s => s.state === 'running').length;
  if (total === 0) return { up, total, status: 'empty', rank: 3 };
  if (up === 0) return { up, total, status: 'down', rank: 0 };
  if (variant === 'ix') return { up, total, status: 'up', rank: 2 };
  if (up < total) return { up, total, status: 'degraded', rank: 1 };
  return { up, total, status: 'up', rank: 2 };
}

// parse "term key:val key2:val2" → { text, filters: { image, port, stack, scope } }
export function parseQuery(q) {
  const out = { text: '', image: '', port: '', stack: '', scope: null };
  const words = (q || '').trim().split(/\s+/).filter(Boolean);
  const free = [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (lw === 'down' || lw === 'stopped') { out.scope = 'stopped'; continue; }
    if (lw === 'up'   || lw === 'running') { out.scope = 'running'; continue; }
    const m = w.match(/^(image|port|stack):(.+)$/i);
    if (m) { out[m[1].toLowerCase()] = m[2].toLowerCase(); continue; }
    free.push(w);
  }
  out.text = free.join(' ').toLowerCase();
  return out;
}
