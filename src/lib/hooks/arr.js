import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

/* Aggregator hook for *arr (Sonarr/Radarr/Lidarr) services.
 * Combines queue + calendar + status + missing + library counts in
 * one polling loop so the dashboard makes a single round-trip per
 * service per tick. Individual sub-fetches that fail return null
 * (state still becomes "live") — only a status failure flips to
 * "error" since that's the canonical "is this service alive" check.
 */
const LIB_PATH = { sonarr: 'series', radarr: 'movie' };

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
  ];
}

export function useArr(svc, { poll = 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const [queue, calendar, status, missing, library] =
        await getJsonAll(buildUrls(svc), { signal });
      // status == null is the canonical health probe — propagate as
      // error so the UI badge can flip red even though we have stale
      // queue/calendar data from a previous tick.
      if (!status) throw new Error('arr_status_unavailable');
      return {
        queue,
        calendar,
        status,
        missing: missing?.totalRecords ?? null,
        total: Array.isArray(library) ? library.length : null,
      };
    },
    { poll, deps: [svc], cacheKey: `arr:${svc}` }
  );
  return data
    ? { ...data, state }
    : { queue: null, calendar: null, status: null, missing: null, total: null, state };
}

// Legacy wrapper kept for Home.jsx; one less full polling loop than
// useArr() since we only need the queue total. If Home is ever
// refactored to share state with NAS/Plex pages, drop this and read
// from a context provider instead.
export function useArrQueue(svc) {
  const { queue } = useArr(svc);
  return queue?.totalRecords ?? null;
}
