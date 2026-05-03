import { useMemo } from 'react';
import { shortName, projectOf, serviceOf, stackHealth, parseQuery } from './utils.js';

/* ============================================================== *
 *  useGroupedContainers — applies the search/scope filter, then
 *  buckets the result into compose stacks (regular + ix-) and
 *  loose containers. Within each stack: stopped containers are
 *  pinned to the top. Across stacks: degraded/down sort first.
 *  Also returns a flat `issues` list for the sticky jump strip.
 * ============================================================== */
export default function useGroupedContainers({ containers, projects, q, scope }) {
  const parsed = useMemo(() => parseQuery(q), [q]);

  const filtered = useMemo(() => {
    const effectiveScope = parsed.scope || scope;
    return containers.filter(c => {
      if (effectiveScope === 'running' && c.state !== 'running') return false;
      if (effectiveScope === 'stopped' && c.state === 'running') return false;
      if (parsed.image) {
        if (!(c.image || '').toLowerCase().includes(parsed.image)) return false;
      }
      if (parsed.port) {
        const hit = (c.ports || []).some(p =>
          String(p.publicPort || '').includes(parsed.port) ||
          String(p.privatePort || '').includes(parsed.port));
        if (!hit) return false;
      }
      if (parsed.stack) {
        const p = (projectOf(c) || '').toLowerCase();
        if (!p.includes(parsed.stack)) return false;
      }
      if (!parsed.text) return true;
      const hay = `${shortName(c)} ${c.image} ${projectOf(c) || ''} ${serviceOf(c) || ''}`.toLowerCase();
      return hay.includes(parsed.text);
    });
  }, [containers, parsed, scope]);

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
    const sortByHealth = (a, b) => a.health.rank - b.health.rank
      || (b.health.total - b.health.up) - (a.health.total - a.health.up)
      || a.project.name.localeCompare(b.project.name);
    const sortServicesDownFirst = (a, b) => {
      const ad = a.state === 'running' ? 1 : 0;
      const bd = b.state === 'running' ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return shortName(a).localeCompare(shortName(b));
    };
    const allStacks = [...map.entries()]
      .map(([name, services]) => {
        const sorted = services.slice().sort(sortServicesDownFirst);
        const isIx = name.startsWith('ix-');
        return {
          project: projectByName.get(name.toLowerCase()) || { name, id: null },
          services: sorted,
          health: stackHealth(sorted, isIx ? 'ix' : null),
          isIx,
        };
      })
      .sort(sortByHealth);
    const stacks = allStacks.filter(s => !s.isIx);
    const ixStacks = allStacks.filter(s =>  s.isIx);
    const looseSorted = loose.slice().sort(sortServicesDownFirst);
    return { stacks, ixStacks, loose: looseSorted };
  }, [filtered, projects]);

  const counts = useMemo(() => {
    const up = containers.filter(c => c.state === 'running').length;
    return {
      total: containers.length,
      up,
      down: containers.length - up,
      matched: filtered.length,
    };
  }, [containers, filtered]);

  // flat issue list (one entry per problem stack/loose container) for the jump strip
  const issues = useMemo(() => {
    const out = [];
    for (const s of [...grouped.stacks, ...grouped.ixStacks]) {
      if (s.health.rank <= 1) {
        out.push({
          kind: 'stack',
          key: `stack-${s.project.name}`,
          name: s.project.name,
          status: s.health.status,
          summary: `${s.health.up}/${s.health.total}`,
        });
      }
    }
    for (const c of grouped.loose) {
      if (c.state !== 'running') {
        out.push({
          kind: 'loose',
          key: `loose-${c.id}`,
          name: shortName(c),
          status: 'down',
          summary: c.state || 'down',
        });
      }
    }
    return out;
  }, [grouped]);

  return { grouped, counts, issues, parsed };
}
