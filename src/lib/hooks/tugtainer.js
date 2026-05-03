import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

const pickNum = (...vals) => vals.find((v) => typeof v === 'number');

/* Tugtainer — pending container updates.
 * Requires `ENABLE_PUBLIC_API=true` on the Tugtainer container.
 * Tries `/api/public/summary` first (richer payload), falls back to
 * `/api/public/update_count`. Response shapes are version-tolerant. */
async function fetchUpdateCount(signal) {
  try {
    const j = await getJson('/api/tugtainer/api/public/summary', { signal });
    const pending = pickNum(j?.update_count, j?.updates, j?.pending, j?.updates_available);
    const total   = pickNum(j?.total, j?.containers_total, j?.count);
    if (typeof pending === 'number') return { pending, total: total ?? null };
  } catch { /* fall through */ }

  const j = await getJson('/api/tugtainer/api/public/update_count', { signal });
  const pending = typeof j === 'number' ? j : pickNum(j?.count, j?.update_count, j?.value);
  if (typeof pending !== 'number') throw new Error('tugtainer_no_count');
  return { pending, total: null };
}

export function useTugtainer({ poll = 5 * 60_000 } = {}) {
  const { data, state } = usePolling(fetchUpdateCount, { poll });
  return { state, pending: data?.pending ?? null, total: data?.total ?? null };
}
