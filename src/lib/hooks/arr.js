import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

export function useArr(svc, { poll = 60_000 } = {}) {
  const [data, setData] = useState({ queue: null, calendar: null, status: null, missing: null, total: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const next30 = new Date(today.getTime() + 30 * 86400 * 1000);
        const libPath = svc === "sonarr" ? "series" : svc === "radarr" ? "movie" : "artist";
        const [queue, calendar, status, missing, library] = await Promise.all([
          getJson(`/api/${svc}/api/v3/queue?pageSize=10&includeUnknownSeriesItems=true`).catch(() => null),
          getJson(`/api/${svc}/api/v3/calendar?start=${today.toISOString()}&end=${next30.toISOString()}&unmonitored=true${svc === 'sonarr' ? '&includeSeries=true' : ''}`).catch(() => null),
          getJson(`/api/${svc}/api/v3/system/status`).catch(() => null),
          getJson(`/api/${svc}/api/v3/wanted/missing?pageSize=1`).catch(() => null),
          getJson(`/api/${svc}/api/v3/${libPath}`).catch(() => null),
        ]);
        if (!alive) return;
        setData({
          queue,
          calendar,
          status,
          missing: missing?.totalRecords ?? null,
          total: Array.isArray(library) ? library.length : null,
          state: status ? "live" : "error",
        });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [svc, poll]);
  return data;
}

// Legacy compat for Home.jsx.
export function useArrQueue(svc) {
  const { queue } = useArr(svc);
  return queue?.totalRecords ?? null;
}
