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
