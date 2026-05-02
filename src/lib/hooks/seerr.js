import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

export function useSeerr({ poll = 60_000 } = {}) {
  const [data, setData] = useState({ counts: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const counts = await getJson("/api/seerr/api/v1/request/count");
        if (!alive) return;
        setData({ counts, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}
