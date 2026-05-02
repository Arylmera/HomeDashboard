import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

export function useGlances({ poll = 15_000 } = {}) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [cpu, mem, fs, sensors, network, percpu] = await Promise.all([
          getJson("/api/glances/api/4/cpu").catch(() => null),
          getJson("/api/glances/api/4/mem").catch(() => null),
          getJson("/api/glances/api/4/fs").catch(() => null),
          getJson("/api/glances/api/4/sensors").catch(() => null),
          getJson("/api/glances/api/4/network").catch(() => null),
          getJson("/api/glances/api/4/percpu").catch(() => null),
        ]);
        if (!alive) return;
        if (!cpu && !mem) { setState("error"); return; }
        setData({ cpu, mem, fs, sensors, network, percpu });
        setState("live");
      } catch {
        if (alive) setState("error");
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return { data, state };
}
