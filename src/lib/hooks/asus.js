import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

function useAsusEndpoint(url, poll) {
  const [data, setData] = useState({ state: 'loading' });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson(url);
        if (!alive) return;
        setData(j);
      } catch {
        if (alive) setData({ state: 'error' });
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [url, poll, tick]);

  return { ...data, refresh };
}

export function useAsus({ poll = 15_000 } = {}) {
  return useAsusEndpoint('/api/asus/status', poll);
}

export function useAsusNode({ poll = 15_000 } = {}) {
  return useAsusEndpoint('/api/asus/node/status', poll);
}
