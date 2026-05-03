/* Pool health helpers — derive SMART / scrub / snapshot dot signals
 * from the data already loaded by useTrueNAS. Used by both the Home
 * NASPanel mini-card and the NAS page pool grid.
 */

const DAY = 86_400_000;

export function fmtAgo(ts) {
  if (!ts) return "—";
  const d = Math.floor((Date.now() - ts) / DAY);
  if (d <= 0) return "today";
  if (d === 1) return "1d";
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  return `${Math.floor(d / 365)}y`;
}

export function scrubDot(p) {
  if (!p.scrubEnd && !p.scrubState) return { cls: "warn", txt: "no scrub recorded" };
  if (p.scrubState === "SCANNING") return { cls: "warn", txt: `${p.scrubFn || "scrub"} running` };
  const ageDays = p.scrubEnd ? Math.floor((Date.now() - p.scrubEnd) / DAY) : null;
  const errors = Number(p.scrubErrors || 0);
  if (errors > 0) return { cls: "down", txt: `last ${p.scrubFn || "scrub"} ${fmtAgo(p.scrubEnd)} · ${errors} errors` };
  if (ageDays != null && ageDays > 45) return { cls: "warn", txt: `last ${p.scrubFn || "scrub"} ${fmtAgo(p.scrubEnd)} (stale)` };
  return { cls: "up", txt: `last ${p.scrubFn || "scrub"} ${fmtAgo(p.scrubEnd)} · clean` };
}

export function snapDot(p) {
  if (!p.latestSnap) return { cls: "warn", txt: "no snapshots" };
  const age = Math.floor((Date.now() - p.latestSnap) / DAY);
  if (age > 7) return { cls: "warn", txt: `last snap ${fmtAgo(p.latestSnap)} (stale)` };
  return { cls: "up", txt: `last snap ${fmtAgo(p.latestSnap)}` };
}

export function smartDot(disks, poolName) {
  const poolDisks = (disks || []).filter(d => d.pool === poolName);
  if (!poolDisks.length) return { cls: "warn", txt: "no disk data" };
  const temps = poolDisks.map(d => d.temp).filter(t => typeof t === "number");
  const max = temps.length ? Math.max(...temps) : null;
  const crit = poolDisks.filter(d => d.critical).length;
  if (crit > 0) return { cls: "down", txt: `${crit} SMART critical` };
  if (max != null && max >= 55) return { cls: "down", txt: `disk temp ${max}°C` };
  if (max != null && max >= 50) return { cls: "warn", txt: `disk temp ${max}°C` };
  if (max != null) return { cls: "up", txt: `${poolDisks.length} disks · max ${max}°C` };
  return { cls: "up", txt: `${poolDisks.length} disks` };
}
