import { useMemo } from 'react';
import { shortName, projectOf, serviceOf } from './utils.js';

/* ============================================================== *
 *  useGroupedContainers — applies the search/scope filter, then
 *  buckets the result into compose stacks (regular + ix-) and
 *  loose containers. Returns the totals for the banner too.
 * ============================================================== */
export default function useGroupedContainers({ containers, projects, q, scope }) {
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return containers.filter(c => {
      if (scope === 'running' && c.state !== 'running') return false;
      if (scope === 'stopped' && c.state === 'running') return false;
      if (!n) return true;
      const hay = `${shortName(c)} ${c.image} ${projectOf(c) || ''} ${serviceOf(c) || ''}`.toLowerCase();
      return hay.includes(n);
    });
  }, [containers, q, scope]);

  const grouped = useMemo(() => {
    const map = new Map();
    const loose = [];
    for (const c of filtered) {
      const p = projectOf(c);
      if (!p) { loose.push(c); continue; }
      if (!map.has(p)) map.set(p, []);
      map.get(p).push(c);
    }
    const projectByName = new Map((projects || []).map(p => [p.name?.toLowerCase(), p]));
    const allStacks = [...map.entries()]
      .map(([name, services]) => ({
        project: projectByName.get(name.toLowerCase()) || { name, id: null },
        services: services.sort((a, b) => shortName(a).localeCompare(shortName(b))),
      }))
      .sort((a, b) => a.project.name.localeCompare(b.project.name));
    const stacks = allStacks.filter(s => !s.project.name.startsWith('ix-'));
    const ixStacks = allStacks.filter(s =>  s.project.name.startsWith('ix-'));
    return { stacks, ixStacks, loose };
  }, [filtered, projects]);

  const counts = useMemo(() => {
    const up = containers.filter(c => c.state === 'running').length;
    return { total: containers.length, up, down: containers.length - up };
  }, [containers]);

  return { grouped, counts };
}
