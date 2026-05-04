import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

const RECENT_TYPES = new Set(['movie', 'show']);
const RECENT_PER_LIB = 8;
const RECENT_TOTAL = 16;

function pickRecent(payload) {
  const md = payload?.MediaContainer?.Metadata ?? [];
  return md.map((m) => ({
    ratingKey: m.ratingKey,
    title: m.type === 'episode' ? (m.grandparentTitle || m.title) : m.title,
    sub: m.type === 'episode'
      ? `S${String(m.parentIndex || 0).padStart(2, '0')}E${String(m.index || 0).padStart(2, '0')} · ${m.title}`
      : (m.year ? String(m.year) : (m.type || '')),
    addedAt: m.addedAt || 0,
    type: m.type,
    thumb: m.type === 'episode' ? (m.grandparentThumb || m.thumb) : (m.thumb || m.art),
    art: m.art,
  })).filter((m) => m.thumb);
}

export function usePlex({ poll = 30_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const [sess, libs] = await getJsonAll([
        '/api/plex/status/sessions',
        '/api/plex/library/sections',
      ], { signal });
      if (!sess) throw new Error('plex_unavailable');
      const dirs = libs?.MediaContainer?.Directory ?? [];

      // Per-library count + recently-added in parallel.
      const watchableLibs = dirs.filter((d) => RECENT_TYPES.has(d.type));
      const [counts, recents] = await Promise.all([
        Promise.all(dirs.map((d) =>
          getJson(`/api/plex/library/sections/${d.key}/all?X-Plex-Container-Size=0&X-Plex-Container-Start=0`, { signal })
            .then((r) => r?.MediaContainer?.totalSize ?? 0)
            .catch(() => 0)
        )),
        Promise.all(watchableLibs.map((d) =>
          getJson(`/api/plex/library/sections/${d.key}/recentlyAdded?X-Plex-Container-Size=${RECENT_PER_LIB}&X-Plex-Container-Start=0`, { signal })
            .then((r) => pickRecent(r))
            .catch(() => [])
        )),
      ]);

      const recentlyAdded = recents.flat()
        .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        .slice(0, RECENT_TOTAL);

      return {
        sessions: sess?.MediaContainer ?? null,
        libraries: dirs.map((d, i) => ({ ...d, count: counts[i] })),
        recentlyAdded,
      };
    },
    { poll, cacheKey: 'plex' }
  );
  return {
    sessions: data?.sessions ?? null,
    libraries: data?.libraries ?? null,
    recentlyAdded: data?.recentlyAdded ?? null,
    state,
  };
}

export function usePlexSessions() {
  const { sessions } = usePlex();
  return sessions?.size ?? null;
}
