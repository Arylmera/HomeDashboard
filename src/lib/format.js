export const fmtBytes = (b) => {
  if (b == null || isNaN(b)) return "—";
  const u = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
};

// Bits per second → human-readable (decimal SI). TrueNAS SCALE reporting
// returns interface rates in bits/sec, matching its UI labels.
export const fmtRate = (bps) => {
  if (bps == null || isNaN(bps)) return "—";
  if (bps < 1000) return `${Math.round(bps)} b/s`;
  if (bps < 1e6)  return `${(bps / 1e3).toFixed(0)} kb/s`;
  if (bps < 1e9)  return `${(bps / 1e6).toFixed(1)} Mb/s`;
  return `${(bps / 1e9).toFixed(2)} Gb/s`;
};

export const fmtNum = (n) => n == null ? "—" : new Intl.NumberFormat("en").format(n);

export const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
