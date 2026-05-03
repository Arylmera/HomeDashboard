/* ============================================================== *
 *  Network — home network overview.
 *  Page shell: hero, banner, filter, section orchestration.
 *  Cards/panels live in ./components, helpers in ./utils.js.
 * ============================================================== */
import { useState, useMemo } from 'react';
import { UI } from '../../lib/icons.jsx';
import { useClock, useGreeting, useWeather } from '../../lib/hooks.js';
import { useNpm } from '../../lib/hooks/npm.js';
import { useWan } from '../../lib/hooks/wan.js';
import { statusOf, certExpiry } from './utils.js';
import FilterBar from './components/FilterBar.jsx';
import Section from './components/Section.jsx';
import ProxyHostCard from './components/ProxyHostCard.jsx';
import RedirectCard from './components/RedirectCard.jsx';
import DeadCard from './components/DeadCard.jsx';
import StreamCard from './components/StreamCard.jsx';
import CertCard from './components/CertCard.jsx';
import AccessListCard from './components/AccessListCard.jsx';
import SpeedtestPanel from './components/SpeedtestPanel.jsx';
import RouterPanel from './components/RouterPanel.jsx';

const NPM_URL = (import.meta.env.VITE_NPM_URL || '').replace(/\/+$/, '');

export default function Network() {
  const now = useClock();
  const greeting = useGreeting();
  const weather = useWeather();
  const npm = useNpm({ poll: 30_000 });
  const wan = useWan({ poll: 30_000 });

  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');

  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const certsById = useMemo(() => {
    const m = new Map();
    for (const c of npm.certificates) m.set(c.id, c);
    return m;
  }, [npm.certificates]);

  const matches = (h) => {
    if (scope !== 'all') {
      const s = statusOf(h);
      if (scope === 'disabled' && h.enabled !== false) return false;
      if (scope === 'online'  && !(s === 'online' && h.enabled !== false)) return false;
      if (scope === 'offline' && !(s === 'offline')) return false;
    }
    const n = q.trim().toLowerCase();
    if (!n) return true;
    const hay = [
      ...(h.domain_names || []),
      h.forward_host, h.forward_domain_name, h.forwarding_host,
      h.forward_port, h.forwarding_port, h.incoming_port,
      h.certificate?.nice_name,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(n);
  };

  const proxyFiltered = useMemo(
    () => npm.proxyHosts
      .filter(matches)
      .sort((a, b) => (a.domain_names?.[0] || '').localeCompare(b.domain_names?.[0] || '')),
    [npm.proxyHosts, q, scope],
  );
  const redirFiltered = useMemo(() => npm.redirectionHosts.filter(matches), [npm.redirectionHosts, q, scope]);
  const deadFiltered  = useMemo(() => npm.deadHosts.filter(matches), [npm.deadHosts, q, scope]);
  const streamFiltered = useMemo(() => npm.streams.filter(matches), [npm.streams, q, scope]);

  const counts = useMemo(() => {
    const all = [
      ...npm.proxyHosts, ...npm.redirectionHosts, ...npm.deadHosts, ...npm.streams,
    ];
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

  const stateLine =
    npm.state === 'loading' ? 'Connecting to Nginx Proxy Manager…' :
    npm.state === 'idle'    ? 'NPM not configured. Set VITE_NPM_URL / NPM_IDENTITY / NPM_SECRET in .env.' :
    npm.state === 'error'   ? 'NPM unreachable. Check the host and credentials.' :
    `${npm.proxyHosts.length} proxy host${npm.proxyHosts.length === 1 ? '' : 's'} · ` +
    `${npm.redirectionHosts.length} redirect${npm.redirectionHosts.length === 1 ? '' : 's'} · ` +
    `${npm.streams.length} stream${npm.streams.length === 1 ? '' : 's'} · ` +
    `${npm.certificates.length} certificate${npm.certificates.length === 1 ? '' : 's'}.`;

  let sectionIdx = 0;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 20 L12 4 L19 20" />
              <path d="M8.5 13 H15.5" />
            </svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">network · npm</span></div>
        </div>
        <div className="topbar-right">
          {NPM_URL && (
            <a className="nav-pill" href={NPM_URL} target="_blank" rel="noreferrer" title="open NPM admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7"/><path d="M21 3 12 12"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
              <span>open NPM</span>
            </a>
          )}
          <button type="button" className="nav-pill" onClick={npm.refresh} title="refresh now">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></svg>
            <span>refresh</span>
          </button>
          <a className="nav-pill" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
            <span>home</span>
          </a>
        </div>
      </div>

      <div className="hero">
        <div>
          <div className="greeting-eyebrow">{dateStr} · Europe/Brussels</div>
          <h1 className="greeting">{greeting}, <em>Guillaume.</em></h1>
          <p className="greeting-sub">{stateLine}</p>
        </div>
        <div className="hero-meta">
          <div className="hero-card">
            <div className="ico">{UI.clock}</div>
            <div>
              <div className="val">{timeStr}</div>
              <div className="lab">local time</div>
            </div>
          </div>
          <div className="hero-card">
            <div className="ico">{UI.cloud}</div>
            <div>
              <div className="val">{weather.temp}°</div>
              <div className="lab">{weather.desc}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="docker-banner">
        <div className="sum">
          <div className="l">WAN</div>
          <div className={'v ' + (wan.state === 'live' ? (wan.up ? 'on' : 'off') : '')}>
            {wan.state === 'live' ? (wan.up ? 'up' : 'down') : '—'}
            <span className="unit">{wan.up && wan.latencyMs != null ? `${wan.latencyMs} ms` : (wan.target || 'sentinel')}</span>
          </div>
        </div>
        <div className="sum"><div className="l">Proxy hosts</div><div className="v on">{npm.proxyHosts.length}<span className="unit">total</span></div></div>
        <div className="sum"><div className="l">Online</div><div className="v">{counts.up}<span className="unit">/ {counts.all}</span></div></div>
        <div className="sum"><div className="l">Offline</div><div className="v">{counts.down}<span className="unit">down</span></div></div>
        <div className="sum"><div className="l">Disabled</div><div className="v">{counts.off}<span className="unit">off</span></div></div>
        <div className="sum"><div className="l">Streams</div><div className="v">{npm.streams.length}<span className="unit">tcp/udp</span></div></div>
        <div className="sum"><div className="l">Certificates</div><div className="v">{npm.certificates.length}<span className="unit">{certCounts.warn ? `${certCounts.warn} expiring` : 'ok'}</span></div></div>
      </div>

      <FilterBar q={q} setQ={setQ} scope={scope} setScope={setScope} counts={counts} />

      {(npm.state === 'idle' || npm.state === 'error') && (
        <section className="section">
          <div className="section-head">
            <div className="section-title">
              <h2>{npm.state === 'idle' ? 'Not configured' : 'Unreachable'}</h2>
            </div>
          </div>
          <p className="net-empty">
            {npm.state === 'idle'
              ? 'Add VITE_NPM_URL, NPM_IDENTITY, NPM_SECRET to .env and restart.'
              : 'Could not reach the NPM API. Check VITE_NPM_URL and credentials.'}
          </p>
        </section>
      )}

      <SpeedtestPanel idx={++sectionIdx} />

      <RouterPanel idx={++sectionIdx} />

      {proxyFiltered.length > 0 && (
        <Section idx={++sectionIdx} title="proxy hosts" count={proxyFiltered.length}>
          <div className="net-grid">
            {proxyFiltered.map(h => <ProxyHostCard key={h.id} h={h} certsById={certsById} />)}
          </div>
        </Section>
      )}

      {redirFiltered.length > 0 && (
        <Section idx={++sectionIdx} title="redirections" count={redirFiltered.length}>
          <div className="net-grid">
            {redirFiltered.map(h => <RedirectCard key={h.id} h={h} />)}
          </div>
        </Section>
      )}

      {streamFiltered.length > 0 && (
        <Section idx={++sectionIdx} title="streams" count={streamFiltered.length}>
          <div className="net-grid">
            {streamFiltered.map(s => <StreamCard key={s.id} s={s} />)}
          </div>
        </Section>
      )}

      {deadFiltered.length > 0 && (
        <Section idx={++sectionIdx} title="404 hosts" count={deadFiltered.length}>
          <div className="net-grid">
            {deadFiltered.map(h => <DeadCard key={h.id} h={h} />)}
          </div>
        </Section>
      )}

      {npm.certificates.length > 0 && (
        <Section idx={++sectionIdx} title="certificates" sub={certCounts.expired ? `${certCounts.expired} expired` : null} count={npm.certificates.length}>
          <div className="net-grid">
            {npm.certificates
              .slice()
              .sort((a, b) => {
                const ea = certExpiry(a)?.days ?? 99999;
                const eb = certExpiry(b)?.days ?? 99999;
                return ea - eb;
              })
              .map(c => <CertCard key={c.id} c={c} />)}
          </div>
        </Section>
      )}

      {npm.accessLists.length > 0 && (
        <Section idx={++sectionIdx} title="access lists" count={npm.accessLists.length}>
          <div className="net-grid">
            {npm.accessLists.map(a => <AccessListCard key={a.id} a={a} />)}
          </div>
        </Section>
      )}

      <div className="footbar" role="status" aria-live="polite">
        <div className="stats">
          <span><span className="status-dot up" aria-hidden="true" /><b>{counts.up}</b> online</span>
          <span><span className="status-dot down" aria-hidden="true" /><b>{counts.down}</b> offline</span>
          <span><b>{npm.proxyHosts.length}</b> proxy hosts</span>
          <span><b>{npm.certificates.length}</b> certificates</span>
        </div>
        <div>arylmera · network · {now.toISOString().slice(0, 10)}</div>
      </div>
    </div>
  );
}
