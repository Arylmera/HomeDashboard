/* ============================================================== *
 *  Network — derived data: filter, split, counts.
 *  Owns q/scope state. Consumes raw npm payload, returns view-ready slices.
 * ============================================================== */
import { useMemo, useState } from 'react';
import { statusOf, certExpiry, isAnomaly } from './utils.js';

export function useNetworkData(npm) {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');

  const certsById = useMemo(() => {
    const m = new Map();
    for (const c of npm.certificates) m.set(c.id, c);
    return m;
  }, [npm.certificates]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (h) => {
      if (scope !== 'all') {
        const s = statusOf(h);
        if (scope === 'disabled' && h.enabled !== false) return false;
        if (scope === 'online'  && !(s === 'online' && h.enabled !== false)) return false;
        if (scope === 'offline' && !(s === 'offline')) return false;
      }
      if (!needle) return true;
      const hay = [
        ...(h.domain_names || []),
        h.forward_host, h.forward_domain_name, h.forwarding_host,
        h.forward_port, h.forwarding_port, h.incoming_port,
        h.certificate?.nice_name,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(needle);
    };
  }, [q, scope]);

  const proxyFiltered = useMemo(
    () => npm.proxyHosts
      .filter(matches)
      .sort((a, b) => (a.domain_names?.[0] || '').localeCompare(b.domain_names?.[0] || '')),
    [npm.proxyHosts, matches],
  );

  const proxySplit = useMemo(() => {
    const healthy = [], anomalies = [];
    for (const h of proxyFiltered) {
      (isAnomaly(h, certsById) ? anomalies : healthy).push(h);
    }
    return { healthy, anomalies };
  }, [proxyFiltered, certsById]);

  const redirFiltered  = useMemo(() => npm.redirectionHosts.filter(matches), [npm.redirectionHosts, matches]);
  const deadFiltered   = useMemo(() => npm.deadHosts.filter(matches),        [npm.deadHosts, matches]);
  const streamFiltered = useMemo(() => npm.streams.filter(matches),          [npm.streams, matches]);

  const counts = useMemo(() => {
    const all = [...npm.proxyHosts, ...npm.redirectionHosts, ...npm.deadHosts, ...npm.streams];
    let up = 0, down = 0, off = 0;
    for (const h of all) {
      if (h.enabled === false) off++;
      else if (h.meta?.nginx_online === true) up++;
      else if (h.meta?.nginx_online === false) down++;
    }
    return { all: all.length, up, down, off };
  }, [npm.proxyHosts, npm.redirectionHosts, npm.deadHosts, npm.streams]);

  const certCounts = useMemo(() => {
    let warn = 0, expired = 0;
    for (const c of npm.certificates) {
      const e = certExpiry(c);
      if (!e) continue;
      if (e.days < 0) expired++;
      else if (e.days <= 14) warn++;
    }
    return { warn, expired };
  }, [npm.certificates]);

  const certsSorted = useMemo(
    () => npm.certificates.slice().sort((a, b) => {
      const ea = certExpiry(a)?.days ?? 99999;
      const eb = certExpiry(b)?.days ?? 99999;
      return ea - eb;
    }),
    [npm.certificates],
  );

  return {
    q, setQ, scope, setScope,
    certsById,
    proxyFiltered, proxySplit,
    redirFiltered, deadFiltered, streamFiltered,
    counts, certCounts, certsSorted,
  };
}

export function npmStateLine(npm) {
  if (npm.state === 'loading') return 'Connecting to Nginx Proxy Manager…';
  if (npm.state === 'idle')    return 'NPM not configured. Set VITE_NPM_URL / NPM_IDENTITY / NPM_SECRET in .env.';
  if (npm.state === 'error')   return 'NPM unreachable. Check the host and credentials.';
  const plural = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;
  return [
    plural(npm.proxyHosts.length, 'proxy host'),
    plural(npm.redirectionHosts.length, 'redirect'),
    plural(npm.streams.length, 'stream'),
    plural(npm.certificates.length, 'certificate'),
  ].join(' · ') + '.';
}
