/* ============================================================== *
 *  Network — shared formatting & status helpers.
 * ============================================================== */

export function fmtScheme(s) { return s === 'https' ? 'https' : 'http'; }

export function statusOf(h) {
  if (h.enabled === false) return 'disabled';
  if (h.meta?.nginx_online === false) return 'offline';
  if (h.meta?.nginx_online === true)  return 'online';
  return 'unknown';
}

export function statusClass(s) {
  if (s === 'online' || s === 'enabled') return 'up';
  if (s === 'disabled') return 'warn';
  if (s === 'offline') return 'down';
  return 'warn';
}

export function certLabel(c) {
  if (!c) return null;
  if (c.provider === 'letsencrypt') return 'LE';
  if (c.provider === 'other') return 'cert';
  return c.nice_name || c.provider || 'cert';
}

export function certExpiry(c) {
  const exp = c?.expires_on || c?.expiry_date;
  if (!exp) return null;
  const d = new Date(exp);
  const days = Math.round((d - Date.now()) / 86400000);
  return { date: d, days };
}

export function joinDomains(arr) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

export function domainHref(domain, scheme) {
  if (!domain) return null;
  const proto = scheme === 'https' ? 'https' : 'http';
  return `${proto}://${domain}`;
}

export function fmtAgo(when) {
  if (!when) return '';
  const t = new Date(when).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function avg(xs) {
  const v = xs.filter(n => n != null && Number.isFinite(n));
  if (!v.length) return null;
  return +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
}

export function maxOf(xs) {
  const v = xs.filter(n => n != null && Number.isFinite(n));
  return v.length ? Math.max(...v) : null;
}

export function fmtUptime(s) {
  if (!Number.isFinite(s) || s <= 0) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtKb(kb) {
  if (!Number.isFinite(kb)) return null;
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(0)} MB`;
  return `${kb} KB`;
}
