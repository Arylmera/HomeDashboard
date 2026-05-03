import { usePolling } from './usePolling.js';
import { getJson, getJsonAll } from './_fetcher.js';

/* Arcane (docker manager).
 * All endpoints under /api/environments/{id}/...; pulls envs first,
 * then containers + projects + image/network/volume counts in parallel. */
export function useArcane({ poll = 15_000 } = {}) {
  const { data, state, refresh } = usePolling(
    async (signal) => {
      const envs = await getJson('/api/arcane/api/environments', { signal });
      const list = envs?.data ?? [];
      const main = list[0];
      if (!main) throw new Error('no environments');
      const base = `/api/arcane/api/environments/${main.id}`;
      const [containers, projects, images, networks, volumes] = await getJsonAll([
        `${base}/containers?limit=500`,
        `${base}/projects?limit=500`,
        `${base}/images?limit=1`,
        `${base}/networks?limit=1`,
        `${base}/volumes?limit=1`,
      ], { signal });
      return {
        envs: list,
        envId: main.id,
        envName: main.name,
        envStatus: main.status,
        containers: containers?.data ?? [],
        projects: projects?.data ?? [],
        counts: {
          images: images?.pagination?.totalItems ?? null,
          networks: networks?.pagination?.totalItems ?? null,
          volumes: volumes?.pagination?.totalItems ?? null,
        },
      };
    },
    { poll, cacheKey: 'arcane'}
  );
  return {
    state,
    envs: data?.envs ?? [],
    envId: data?.envId,
    envName: data?.envName,
    envStatus: data?.envStatus,
    containers: data?.containers ?? [],
    projects: data?.projects ?? [],
    counts: data?.counts ?? {},
    refresh,
  };
}

// Container/project actions — fire-and-forget POSTs against the Arcane proxy.
export async function arcaneAction(envId, kind, id, action) {
  const r = await fetch(`/api/arcane/api/environments/${envId}/${kind}/${id}/${action}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}
