import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

export function useNpm({ poll = 30_000 } = {}) {
  const [data, setData] = useState({
    state: 'loading',
    proxyHosts: [], redirectionHosts: [], deadHosts: [],
    streams: [], certificates: [], accessLists: [],
  });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson('/api/npm/overview');
        if (!alive) return;
        if (j.state !== 'live') {
          setData(d => ({ ...d, state: j.state || 'error' }));
          return;
        }
        setData({
          state: 'live',
          proxyHosts:       j['proxy-hosts'] || [],
          redirectionHosts: j['redirection-hosts'] || [],
          deadHosts:        j['dead-hosts'] || [],
          streams:          j['streams'] || [],
          certificates:     j['certificates'] || [],
          accessLists:      j['access-lists'] || [],
        });
      } catch {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, tick]);

  return { ...data, refresh };
}
