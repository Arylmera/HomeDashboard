import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

/* Aggregator hook for *arr (Sonarr/Radarr/Lidarr) services.
 * Combines queue + calendar + status + missing + library counts +
 * health in one polling loop. Maintains a small in-memory history
 * ring (per service) for sparkline rendering — survives the page
 * lifecycle, not browser reloads. */
const LIB_PATH = { sonarr: 'series', radarr: 'movie' };
const HISTORY_MAX = 30;
const HISTORY = new Map(); // svc -> [{ t, missing, queue }]

function pushHistory(svc, sample) {
  const list = HISTORY.get(svc) ?? [];
  const last = list[list.length - 1];
  if (last && last.missing === sample.missing && last.queue === sample.queue) {
    last.t = sample.t;
    return list;
  }
  list.push(sample);
  while (list.length > HISTORY_MAX) list.shift();
  HISTORY.set(svc, list);
  return list;
}

export function getArrHistory(svc) {
  return HISTORY.get(svc) ?? [];
}

function buildUrls(svc) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const next30 = new Date(today.getTime() + 30 * 86_400 * 1000);
  const lib = LIB_PATH[svc] || 'artist';
  const calExtras = svc === 'sonarr' ? '&includeSeries=true' : '';
  return [
    `/api/${svc}/api/v3/queue?pageSize=10&includeUnknownSeriesItems=true`,
    `/api/${svc}/api/v3/calendar?start=${today.toISOString()}&end=${next30.toISOString()}&unmonitored=true${calExtras}`,
    `/api/${svc}/api/v3/system/status`,
    `/api/${svc}/api/v3/wanted/missing?pageSize=1`,
    `/api/${svc}/api/v3/${lib}`,
    `/api/${svc}/api/v3/health`,
  ];
}

export function useArr(svc, { poll = 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const [queue, calendar, status, missing, library, health] =
        await getJsonAll(buildUrls(svc), { signal });
      if (!status) throw new Error('arr_status_unavailable');
      const sample = {
        t: Date.now(),
        missing: missing?.totalRecords ?? 0,
        queue: queue?.totalRecords ?? 0,
      };
      pushHistory(svc, sample);
      return {
        queue,
        calendar,
        status,
        missing: missing?.totalRecords ?? null,
        total: Array.isArray(library) ? library.length : null,
        health: Array.isArray(health) ? health : [],
        history: HISTORY.get(svc) ?? [],
      };
    },
    { poll, deps: [svc], cacheKey: `arr:${svc}` }
  );
  return data
    ? { ...data, state }
    : { queue: null, calendar: null, status: null, missing: null, total: null, health: [], history: [], state };
}

export function useArrQueue(svc) {
  const { queue } = useArr(svc);
  return queue?.totalRecords ?? null;
}
