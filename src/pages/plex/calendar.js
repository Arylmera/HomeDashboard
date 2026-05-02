import { useMemo } from 'react';

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function buildMonthGrid(year, month) {
  // Monday-first 6×7 grid covering the given month
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const SONARR_BASE = (import.meta.env.VITE_SONARR_URL || '').replace(/\/$/, '');
const RADARR_BASE = (import.meta.env.VITE_RADARR_URL || '').replace(/\/$/, '');

export function useUpcoming(sonarr, radarr) {
  return useMemo(() => {
    const items = [];
    if (sonarr.calendar) {
      for (const ep of sonarr.calendar) {
        const code = `S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
        const epTitle = ep.title || 'TBA';
        const slug = ep.series?.titleSlug;
        items.push({
          when: ep.airDateUtc,
          title: ep.series?.title || ep.seriesTitle || 'Unknown series',
          sub: `${code} · ${epTitle}`,
          kind: 'sonarr',
          href: SONARR_BASE && slug ? `${SONARR_BASE}/series/${slug}` : null,
        });
      }
    }
    if (radarr.calendar) {
      for (const m of radarr.calendar) {
        items.push({
          when: m.inCinemas || m.digitalRelease || m.physicalRelease,
          title: m.title,
          sub: `${m.year} · ${m.studio || 'release'}`,
          kind: 'radarr',
          href: RADARR_BASE && m.titleSlug ? `${RADARR_BASE}/movie/${m.titleSlug}` : null,
        });
      }
    }
    return items
      .filter(i => i.when)
      .sort((a, b) => new Date(a.when) - new Date(b.when));
  }, [sonarr.calendar, radarr.calendar]);
}
