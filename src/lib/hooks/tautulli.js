import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

export function useTautulli({ poll = 30_000 } = {}) {
  const [data, setData] = useState({ home: null, activity: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [home, act] = await Promise.all([
          getJson("/api/tautulli/api/v2?cmd=get_home_stats&time_range=7&stats_count=5").catch(() => null),
          getJson("/api/tautulli/api/v2?cmd=get_activity").catch(() => null),
        ]);
        if (!alive) return;
        setData({
          home: home?.response?.data ?? null,
          activity: act?.response?.data ?? null,
          state: act ? "live" : "error",
        });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// Recently added (movies + episodes) via Tautulli.
export function useRecentlyAdded({ count = 8, poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ items: [], state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson(`/api/tautulli/api/v2?cmd=get_recently_added&count=${count}`);
        const rows = j?.response?.data?.recently_added || [];
        const items = rows.map(r => {
          // Prefer the show poster for episodes (grandparent_rating_key) so
          // the strip reads as a wall of posters instead of episode stills.
          const posterKey = r.media_type === "episode"
            ? (r.grandparent_rating_key || r.parent_rating_key || r.rating_key)
            : r.rating_key;
          // Tautulli serves Plex art via api/v2 cmd=pms_image_proxy. The
          // Vite proxy appends `&apikey=…` server-side so the token never
          // reaches the browser.
          const thumb = posterKey
            ? `/api/tautulli/api/v2?cmd=pms_image_proxy&rating_key=${encodeURIComponent(posterKey)}&width=240&height=360&fallback=poster`
            : (r.thumb
                ? `/api/tautulli/api/v2?cmd=pms_image_proxy&img=${encodeURIComponent(r.thumb)}&width=240&height=360&fallback=poster`
                : null);
          return {
            key: r.rating_key || `${r.title}-${r.added_at}`,
            title: r.media_type === "episode"
              ? `${r.grandparent_title} · ${r.title}`
              : r.title,
            year: r.year,
            type: r.media_type,
            addedAt: r.added_at ? Number(r.added_at) * 1000 : null,
            thumb,
          };
        });
        if (alive) setData({ items, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [count, poll]);
  return data;
}
