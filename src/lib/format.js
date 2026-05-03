/* ============================================================== *
 *  Display formatters — pure, locale-aware, NaN-safe.
 *  Imported by every page; keep imports minimal.
 * ============================================================== */

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

export const fmtBytes = (b) => {
  if (!isNum(b)) return '—';
  const u = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
};

// Bits per second → human-readable (decimal SI). TrueNAS SCALE reporting
// returns interface rates in bits/sec, matching its UI labels.
export const fmtRate = (bps) => {
  if (!isNum(bps)) return '—';
  if (bps < 1000) return `${Math.round(bps)} b/s`;
  if (bps < 1e6)  return `${(bps / 1e3).toFixed(0)} kb/s`;
  if (bps < 1e9)  return `${(bps / 1e6).toFixed(1)} Mb/s`;
  return `${(bps / 1e9).toFixed(2)} Gb/s`;
};

export const fmtNum = (n) =>
  isNum(n) ? new Intl.NumberFormat('en').format(n) : '—';

export const pct = (a, b) =>
  isNum(a) && isNum(b) && b !== 0 ? Math.round((a / b) * 100) : 0;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Relative time: epoch-ms or Date → "12s ago" / "3d ago".
// Returns "—" for missing input. Future timestamps render as
// "in 2h" rather than negative ages so calendar UIs stay readable.
export const fmtRelativeTime = (ms, now = Date.now()) => {
  const t = ms instanceof Date ? ms.getTime() : ms;
  if (!isNum(t)) return '—';
  const diff = now - t;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const fmt = (v, u) => future ? `in ${v}${u}` : `${v}${u} ago`;
  if (abs < 60_000)         return future ? 'soon' : 'just now';
  if (abs < 3_600_000)      return fmt(Math.round(abs / 60_000), 'm');
  if (abs < 86_400_000)     return fmt(Math.round(abs / 3_600_000), 'h');
  if (abs < 30 * 86_400_000) return fmt(Math.round(abs / 86_400_000), 'd');
  if (abs < 365 * 86_400_000) return fmt(Math.round(abs / (30 * 86_400_000)), 'mo');
  return fmt(Math.round(abs / (365 * 86_400_000)), 'y');
};

// Short uptime: seconds → "3d 4h" / "12m". Used by NAS + router pages.
export const fmtUptime = (seconds) => {
  if (!isNum(seconds) || seconds < 0) return '—';
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};
