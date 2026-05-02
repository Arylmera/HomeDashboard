import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

/* Arcane (docker manager).
 * All endpoints under /api/environments/{id}/...; pulls envs first,
 * then containers + projects + image/network/volume counts in parallel. */
export function useArcane({ poll = 15_000 } = {}) {
  const [data, setData] = useState({ state: "loading", envs: [], containers: [], projects: [], counts: {} });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const envs = await getJson("/api/arcane/api/environments");
        const list = envs?.data ?? [];
        const main = list[0];
        if (!main) throw new Error("no environments");
        const base = `/api/arcane/api/environments/${main.id}`;
        const [containers, projects, images, networks, volumes] = await Promise.all([
          getJson(`${base}/containers?limit=500`).catch(() => null),
          getJson(`${base}/projects?limit=500`).catch(() => null),
          getJson(`${base}/images?limit=1`).catch(() => null),
          getJson(`${base}/networks?limit=1`).catch(() => null),
          getJson(`${base}/volumes?limit=1`).catch(() => null),
        ]);
        if (!alive) return;
        setData({
          state: "live",
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
        });
      } catch {
        if (alive) setData(d => ({ ...d, state: "error" }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, tick]);
  return { ...data, refresh };
}

// Container/project actions — fire-and-forget POSTs against the Arcane proxy.
export async function arcaneAction(envId, kind, id, action) {
  const r = await fetch(`/api/arcane/api/environments/${envId}/${kind}/${id}/${action}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}
