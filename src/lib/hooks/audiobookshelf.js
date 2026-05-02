import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

export function useAudiobookshelf({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ libraries: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson("/api/audiobookshelf/api/libraries");
        if (!alive) return;
        setData({ libraries: j?.libraries ?? [], state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}
