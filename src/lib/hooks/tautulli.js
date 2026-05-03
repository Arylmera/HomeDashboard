import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

export function useTautulli({ poll = 30_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const [home, act] = await getJsonAll([
        '/api/tautulli/api/v2?cmd=get_home_stats&time_range=7&stats_count=5',
        '/api/tautulli/api/v2?cmd=get_activity',
      ], { signal });
      // Activity is the canonical liveness probe.
      if (!act) throw new Error('tautulli_unavailable');
      return {
        home: home?.response?.data ?? null,
        activity: act?.response?.data ?? null,
      };
    },
    { poll }
  );
  return { state, home: data?.home ?? null, activity: data?.activity ?? null };
}

// Exported so the recently-added strip can be unit-tested without
// pulling in React rendering.
export function shapeRecentlyAddedRow(r) {
  // Prefer the show poster for episodes (grandparent_rating_key) so the
  // strip reads as a wall of posters instead of episode stills.
  const posterKey = r.media_type === 'episode'
    ? (r.grandparent_rating_key || r.parent_rating_key || r.rating_key)
    : r.rating_key;
  const thumb = posterKey
    ? `/api/tautulli/api/v2?cmd=pms_image_proxy&rating_key=${encodeURIComponent(posterKey)}&width=240&height=360&fallback=poster`
    : (r.thumb
        ? `/api/tautulli/api/v2?cmd=pms_image_proxy&img=${encodeURIComponent(r.thumb)}&width=240&height=360&fallback=poster`
        : null);
  return {
    key: r.rating_key || `${r.title}-${r.added_at}`,
    title: r.media_type === 'episode'
      ? `${r.grandparent_title} · ${r.title}`
      : r.title,
    year: r.year,
    type: r.media_type,
    addedAt: r.added_at ? Number(r.added_at) * 1000 : null,
    thumb,
  };
}

export function useRecentlyAdded({ count = 8, poll = 5 * 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const j = await getJson(`/api/tautulli/api/v2?cmd=get_recently_added&count=${count}`, { signal });
      return (j?.response?.data?.recently_added || []).map(shapeRecentlyAddedRow);
    },
    { poll, deps: [count] }
  );
  return { state, items: data || [] };
}
