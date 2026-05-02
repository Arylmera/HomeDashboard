/* ============================================================== *
 *  Network — home network overview.
 *  Section 01: Nginx Proxy Manager (proxy/redirect/dead/streams,
 *              certificates, access lists).
 *  Future sections: router, traffic, Wi-Fi, etc.
 * ============================================================== */
import { useState, useMemo, useRef, useEffect } from 'react';
import { UI } from '../../lib/icons.jsx';
import { useClock, useGreeting, useWeather } from '../../lib/hooks.js';
import { useNpm } from '../../lib/hooks/npm.js';
import { useAsus } from '../../lib/hooks/asus.js';
import { useSpeedtest, useSpeedtestHistory } from '../../lib/hooks/speedtest.js';
import Sparkline from '../../components/Sparkline.jsx';

const NPM_URL = (import.meta.env.VITE_NPM_URL || '').replace(/\/+$/, '');

/* ── helpers ────────────────────────────────────────────────── */

function fmtScheme(s) { return s === 'https' ? 'https' : 'http'; }

function statusOf(h) {
  if (h.enabled === false) return 'disabled';
  if (h.meta?.nginx_online === false) return 'offline';
  if (h.meta?.nginx_online === true)  return 'online';
  return 'unknown';
}
function statusClass(s) {
  if (s === 'online' || s === 'enabled') return 'up';
  if (s === 'disabled') return 'warn';
  if (s === 'offline') return 'down';
  return 'warn';
}

function certLabel(c) {
  if (!c) return null;
  if (c.provider === 'letsencrypt') return 'LE';
  if (c.provider === 'other') return 'cert';
  return c.nice_name || c.provider || 'cert';
}

function certExpiry(c) {
  const exp = c?.expires_on || c?.expiry_date;
  if (!exp) return null;
  const d = new Date(exp);
  const days = Math.round((d - Date.now()) / 86400000);
  return { date: d, days };
}

function joinDomains(arr) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

function domainHref(domain, scheme) {
  if (!domain) return null;
  const proto = scheme === 'https' ? 'https' : 'http';
  return `${proto}://${domain}`;
}

function DomainLink({ domain, scheme, className, children }) {
  const href = domainHref(domain, scheme);
  if (!href) return <span className={className}>{children ?? domain}</span>;
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`open ${href}`}
    >
      {children ?? domain}
    </a>
  );
}

/* ── status dot ─────────────────────────────────────────────── */

function Dot({ s }) {
  return <span className={`status-dot ${statusClass(s)}`} title={s} />;
}

/* ── proxy host card ────────────────────────────────────────── */

function ProxyHostCard({ h, certsById }) {
  const status = statusOf(h);
  const cert = h.certificate || certsById.get(h.certificate_id);
  const exp = certExpiry(cert);
  const expiringSoon = exp && exp.days <= 14;
  const domains = h.domain_names || [];

  const flags = [];
  if (h.ssl_forced) flags.push('SSL forced');
  if (h.http2_support) flags.push('HTTP/2');
  if (h.hsts_enabled) flags.push('HSTS');
  if (h.block_exploits) flags.push('block exploits');
  if (h.caching_enabled) flags.push('cache');
  if (h.allow_websocket_upgrade) flags.push('ws');

  const primary = domains[0];
  const linkScheme = h.ssl_forced || cert ? 'https' : 'http';
  return (
    <div className={'net-card' + (h.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <DomainLink
          domain={primary}
          scheme={linkScheme}
          className="net-card-name net-card-link"
        >
          <span title={joinDomains(domains)}>
            {primary || `#${h.id}`}
            {domains.length > 1 && <span className="net-card-more"> +{domains.length - 1}</span>}
          </span>
        </DomainLink>
        {cert && (
          <span
            className={'cert-chip' + (expiringSoon ? ' is-warn' : '')}
            title={exp ? `expires ${exp.date.toISOString().slice(0, 10)} (${exp.days}d)` : ''}
          >
            {certLabel(cert)}
            {exp && <span className="cert-days">{exp.days}d</span>}
          </span>
        )}
      </div>

      <div className="net-card-target">
        <span className="scheme">{fmtScheme(h.forward_scheme)}://</span>
        <span className="host">{h.forward_host}</span>
        <span className="colon">:</span>
        <span className="port">{h.forward_port}</span>
      </div>

      {flags.length > 0 && (
        <div className="net-card-flags">
          {flags.map((f, i) => <span key={i} className="flag-chip">{f}</span>)}
        </div>
      )}

      {h.access_list?.name && (
        <div className="net-card-acl" title={`access list: ${h.access_list.name}`}>
          🔒 {h.access_list.name}
        </div>
      )}
    </div>
  );
}

/* ── redirect / dead / stream cards ─────────────────────────── */

function RedirectCard({ h }) {
  const status = statusOf(h);
  const domains = h.domain_names || [];
  const fwdScheme = h.forward_scheme || 'http';
  return (
    <div className={'net-card' + (h.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <DomainLink
          domain={domains[0]}
          scheme={fwdScheme === 'https' ? 'https' : 'http'}
          className="net-card-name net-card-link"
        >
          <span title={joinDomains(domains)}>
            {domains[0] || `#${h.id}`}
            {domains.length > 1 && <span className="net-card-more"> +{domains.length - 1}</span>}
          </span>
        </DomainLink>
        <span className="redir-code">{h.forward_http_code || 301}</span>
      </div>
      <DomainLink
        domain={h.forward_domain_name}
        scheme={fwdScheme}
        className="net-card-target net-card-link"
      >
        <span className="scheme">{fmtScheme(fwdScheme)}://</span>
        <span className="host">{h.forward_domain_name}</span>
      </DomainLink>
    </div>
  );
}

function DeadCard({ h }) {
  const status = statusOf(h);
  const domains = h.domain_names || [];
  return (
    <div className={'net-card' + (h.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <DomainLink
          domain={domains[0]}
          scheme="http"
          className="net-card-name net-card-link"
        >
          <span title={joinDomains(domains)}>
            {domains[0] || `#${h.id}`}
            {domains.length > 1 && <span className="net-card-more"> +{domains.length - 1}</span>}
          </span>
        </DomainLink>
        <span className="redir-code">404</span>
      </div>
    </div>
  );
}

function StreamCard({ s }) {
  const status = statusOf(s);
  const protos = [];
  if (s.tcp_forwarding) protos.push('tcp');
  if (s.udp_forwarding) protos.push('udp');
  return (
    <div className={'net-card' + (s.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <div className="net-card-name">:{s.incoming_port}</div>
        <span className="redir-code">{protos.join('/').toUpperCase() || '—'}</span>
      </div>
      <div className="net-card-target">
        <span className="host">{s.forwarding_host}</span>
        <span className="colon">:</span>
        <span className="port">{s.forwarding_port}</span>
      </div>
    </div>
  );
}

/* ── certificate / access-list cards ────────────────────────── */

function CertCard({ c }) {
  const exp = certExpiry(c);
  const expiringSoon = exp && exp.days <= 14;
  const expired = exp && exp.days < 0;
  return (
    <div className={'net-card' + (expired ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={expired ? 'offline' : expiringSoon ? 'unknown' : 'online'} />
        <div className="net-card-name" title={joinDomains(c.domain_names)}>
          {c.nice_name || c.domain_names?.[0] || `#${c.id}`}
        </div>
        <span className={'cert-chip' + (expiringSoon ? ' is-warn' : '')}>
          {c.provider === 'letsencrypt' ? 'LE' : (c.provider || 'cert')}
        </span>
      </div>
      <div className="net-card-meta">
        {c.domain_names?.length > 1 && <span>{c.domain_names.length} domains</span>}
        {exp && (
          <span className={expiringSoon ? 'warn' : ''}>
            {expired ? 'expired' : `${exp.days}d`} · {exp.date.toISOString().slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  );
}

function AccessListCard({ a }) {
  const items = a.items || [];
  const clients = a.clients || [];
  return (
    <div className="net-card">
      <div className="net-card-head">
        <Dot s="online" />
        <div className="net-card-name">{a.name}</div>
      </div>
      <div className="net-card-meta">
        <span>{items.length} user{items.length === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>{clients.length} ip rule{clients.length === 1 ? '' : 's'}</span>
        {a.satisfy_any ? <span>· any</span> : <span>· all</span>}
      </div>
    </div>
  );
}

/* ── speedtest panel ────────────────────────────────────────── */

const SPEEDTEST_URL = (import.meta.env.VITE_SPEEDTEST_URL || '').replace(/\/+$/, '');

function fmtAgo(when) {
  if (!when) return '';
  const t = new Date(when).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function avg(xs) {
  const v = xs.filter(n => n != null && Number.isFinite(n));
  if (!v.length) return null;
  return +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
}
function maxOf(xs) {
  const v = xs.filter(n => n != null && Number.isFinite(n));
  return v.length ? Math.max(...v) : null;
}

function SpeedMetric({ label, value, unit, sub, series, color, seed }) {
  const fmt = (v) => (v == null ? '—' : (Math.abs(v) >= 100 ? Math.round(v) : (+v).toFixed(1)));
  return (
    <div className="speed-metric">
      <div className="speed-metric-head">
        <span className="speed-metric-label">{label}</span>
        {sub && <span className="speed-metric-sub">{sub}</span>}
      </div>
      <div className="speed-metric-value">
        {value == null ? <span className="dim">—</span> : <span>{fmt(value)}</span>}
        <span className="unit">{unit}</span>
      </div>
      <div className="speed-metric-spark">
        <Sparkline
          data={series}
          color={color}
          w={300} h={64}
          seed={seed}
          maxPoints={288}
          format={fmt}
          axisLabel="24h"
        />
      </div>
    </div>
  );
}

function SpeedtestPanel({ idx }) {
  const hist = useSpeedtestHistory({ limit: 48, poll: 5 * 60_000 });
  const latest = useSpeedtest();
  const histItems = hist.items || [];

  // Server-persisted 24h ring buffer (SQLite via /api/metrics).
  const [persisted, setPersisted] = useState({ down: [], up: [], ping: [], loss: [] });
  const [persistedState, setPersistedState] = useState('loading');
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const r = await fetch(`/api/metrics?since=${since}`);
        if (!r.ok) throw new Error('http ' + r.status);
        const data = await r.json();
        if (!alive) return;
        const tail = (s) => (data[s] || []).map(([, v]) => v);
        setPersisted({
          down: tail('speedtest.down'),
          up:   tail('speedtest.up'),
          ping: tail('speedtest.ping'),
          loss: tail('speedtest.loss'),
        });
        setPersistedState('live');
      } catch {
        if (alive) setPersistedState('error');
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Client-side accumulator (fallback when both server metrics + /list fail).
  const accumRef = useRef([]);
  const [, forceRerender] = useState(0);
  useEffect(() => {
    if (latest.state !== 'live') return;
    if (latest.down == null && latest.up == null) return;
    const cur = accumRef.current;
    const last = cur[cur.length - 1];
    const sig = `${latest.when || ''}|${latest.down}|${latest.up}|${latest.ping}`;
    const lastSig = last ? `${last.when || ''}|${last.down}|${last.up}|${last.ping}` : '';
    if (sig !== lastSig) {
      accumRef.current = [...cur, {
        down: latest.down, up: latest.up, ping: latest.ping, when: latest.when,
      }].slice(-288);
      forceRerender(x => x + 1);
    }
  }, [latest.down, latest.up, latest.ping, latest.when, latest.state]);

  // Pick the richest source for each metric: server-persisted > /list > client accum > latest.
  const fromList = {
    down: histItems.map(x => x.down).filter(v => v != null),
    up:   histItems.map(x => x.up).filter(v => v != null),
    ping: histItems.map(x => x.ping).filter(v => v != null),
    loss: histItems.map(x => x.loss).filter(v => v != null),
  };
  const fromAccum = {
    down: accumRef.current.map(x => x.down).filter(v => v != null),
    up:   accumRef.current.map(x => x.up).filter(v => v != null),
    ping: accumRef.current.map(x => x.ping).filter(v => v != null),
    loss: [],
  };
  const liveLatest = (key) => {
    if (latest.state !== 'live') return null;
    if (key === 'down') return latest.down;
    if (key === 'up')   return latest.up;
    if (key === 'ping') return latest.ping;
    return null;
  };
  const pick = (key) => {
    const sources = [persisted[key], fromList[key], fromAccum[key]];
    let best = sources[0] || [];
    for (const s of sources) if ((s?.length || 0) > best.length) best = s;
    if (best && best.length) return best;
    const v = liveLatest(key);
    return v != null ? [v] : [];
  };

  const downSeries = pick('down');
  const upSeries   = pick('up');
  const pingSeries = pick('ping');

  const last = histItems[histItems.length - 1] || (latest.state === 'live' ? {
    down: latest.down, up: latest.up, ping: latest.ping, when: latest.when,
    server: null, isp: null, loss: null,
  } : null);

  const sampleCount = Math.max(persisted.down.length, histItems.length, accumRef.current.length);

  const downAvg = avg(downSeries);
  const upAvg = avg(upSeries);
  const pingAvg = avg(pingSeries);
  const downMax = maxOf(downSeries);
  const upMax = maxOf(upSeries);

  const loading = persistedState === 'loading' && hist.state === 'loading' && latest.state === 'loading';
  const errored = persistedState === 'error' && hist.state === 'error' && latest.state === 'error';
  const empty = !loading && !last && sampleCount === 0;

  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx).padStart(2, '0')}</span>
          <h2>speedtest</h2>
        </div>
        <span className="section-meta">
          {loading && 'loading…'}
          {errored && 'unreachable'}
          {!loading && !errored && (last || sampleCount > 0) && (
            <>
              {sampleCount} sample{sampleCount === 1 ? '' : 's'} · 24h
              {last?.when && <> · last {fmtAgo(last.when)}</>}
              {last?.server && <> · {last.server}</>}
            </>
          )}
        </span>
      </div>

      {empty && !errored && <p className="net-empty">No speedtest results yet.</p>}
      {errored && <p className="net-empty">Speedtest tracker unreachable. Check VITE_SPEEDTEST_URL / SPEEDTEST_API_KEY.</p>}

      {!errored && !empty && (
        <div className="speed-panel">
          <SpeedMetric
            label="download"
            value={last?.down ?? downSeries[downSeries.length - 1]}
            unit="Mbps"
            sub={downAvg != null ? `avg ${downAvg} · max ${downMax}` : null}
            series={downSeries}
            color="oklch(0.78 0.14 220)"
            seed={1}
          />
          <SpeedMetric
            label="upload"
            value={last?.up ?? upSeries[upSeries.length - 1]}
            unit="Mbps"
            sub={upAvg != null ? `avg ${upAvg} · max ${upMax}` : null}
            series={upSeries}
            color="oklch(0.78 0.14 150)"
            seed={2}
          />
          <SpeedMetric
            label="ping"
            value={last?.ping ?? pingSeries[pingSeries.length - 1]}
            unit="ms"
            sub={pingAvg != null ? `avg ${pingAvg}` : null}
            series={pingSeries}
            color="var(--ember)"
            seed={3}
          />
          <div className="speed-meta">
            {last?.isp && <div><span className="k">isp</span><span className="v">{last.isp}</span></div>}
            {last?.server && <div><span className="k">server</span><span className="v">{last.server}</span></div>}
            {last?.loss != null && <div><span className="k">loss</span><span className="v">{last.loss}%</span></div>}
            {SPEEDTEST_URL && (
              <a className="speed-open" href={SPEEDTEST_URL} target="_blank" rel="noreferrer">open tracker →</a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── router panel ───────────────────────────────────────────── */

const ASUS_URL = (import.meta.env.VITE_ASUS_URL || '').replace(/\/+$/, '');

function fmtUptime(s) {
  if (!Number.isFinite(s) || s <= 0) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}
function fmtKb(kb) {
  if (!Number.isFinite(kb)) return null;
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(0)} MB`;
  return `${kb} KB`;
}

function RouterMetric({ label, value, unit, sub, pct, color }) {
  return (
    <div className="speed-metric router-metric">
      <div className="speed-metric-head">
        <span className="speed-metric-label">{label}</span>
        {sub && <span className="speed-metric-sub">{sub}</span>}
      </div>
      <div className="speed-metric-value">
        {value == null ? <span className="dim">—</span> : <span>{value}</span>}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {pct != null && (
        <div className="router-bar" aria-hidden="true">
          <div
            className="router-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

function RouterPanel({ idx }) {
  const r = useAsus({ poll: 15_000 });
  const loading = r.state === 'loading';
  const idle = r.state === 'idle';
  const errored = r.state === 'error';
  const live = r.state === 'live';

  const cpu = r.cpu;
  const memPct = r.mem?.pct;
  const memUsed = fmtKb(r.mem?.usedKb);
  const memTotal = fmtKb(r.mem?.totalKb);
  const upStr = fmtUptime(r.uptime?.seconds);
  const wanUp = r.wan?.up;

  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx).padStart(2, '0')}</span>
          <h2>router</h2>
        </div>
        <span className="section-meta">
          {loading && 'loading…'}
          {idle && 'not configured'}
          {errored && 'unreachable'}
          {live && (
            <>
              {r.model || 'asus'}
              {r.firmware && <> · fw {r.firmware}</>}
              {upStr && <> · up {upStr}</>}
            </>
          )}
        </span>
      </div>

      {idle && (
        <p className="net-empty">
          ASUS router not configured. Set VITE_ASUS_URL / ASUS_USERNAME / ASUS_PASSWORD in .env.
        </p>
      )}
      {errored && (
        <p className="net-empty">
          Router unreachable. Check VITE_ASUS_URL and credentials.
        </p>
      )}

      {live && (
        <div className="speed-panel router-panel">
          <RouterMetric
            label="wan"
            value={wanUp ? 'up' : 'down'}
            sub={r.wan?.type ? r.wan.type.toUpperCase() : null}
          />
          <RouterMetric
            label="public ip"
            value={r.wanIp || (r.wan?.ip || null)}
            sub={r.wan?.gateway ? `gw ${r.wan.gateway}` : null}
          />
          <RouterMetric
            label="cpu"
            value={cpu != null ? cpu : null}
            unit="%"
            pct={cpu}
            color="oklch(0.78 0.14 220)"
            sub={r.uptime?.load ? `load ${r.uptime.load.join(' / ')}` : null}
          />
          <RouterMetric
            label="memory"
            value={memPct != null ? memPct : null}
            unit="%"
            pct={memPct}
            color="oklch(0.78 0.14 150)"
            sub={memUsed && memTotal ? `${memUsed} / ${memTotal}` : null}
          />
          <RouterMetric
            label="clients"
            value={r.clients?.online ?? null}
            unit={r.clients?.total ? `/ ${r.clients.total}` : null}
            sub={r.clients ? `${r.clients.wired ?? 0} wired · ${r.clients.wireless ?? 0} wifi` : null}
          />
          <div className="speed-meta">
            <div><span className="k">model</span><span className="v">{r.model || '—'}</span></div>
            {r.firmware && <div><span className="k">firmware</span><span className="v">{r.firmware}</span></div>}
            {ASUS_URL && (
              <a className="speed-open" href={ASUS_URL} target="_blank" rel="noreferrer">open router →</a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── section ────────────────────────────────────────────────── */

function Section({ idx, title, sub, count, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx).padStart(2, '0')}</span>
          <h2>{title}</h2>
        </div>
        <span className="section-meta">{sub ? `${sub} · ` : ''}{count} entr{count === 1 ? 'y' : 'ies'}</span>
      </div>
      {children}
    </section>
  );
}

/* ── filter bar ─────────────────────────────────────────────── */

function FilterBar({ q, setQ, scope, setScope, counts }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault(); inputRef.current?.focus();
      }
      if (e.key === 'Escape') inputRef.current?.blur();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="search-wrap">
      <div className="searchbar">
        <span className="q">{UI.search}</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by domain, host, port, certificate…"
        />
        <div className="search-scope">
          {[
            ['all',      `all ${counts.all}`],
            ['online',   `up ${counts.up}`],
            ['offline',  `down ${counts.down}`],
            ['disabled', `off ${counts.off}`],
          ].map(([id, label]) => (
            <button key={id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>{label}</button>
          ))}
        </div>
        <span className="kbd">⌘K</span>
      </div>
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────── */

export default function Network() {
  const now = useClock();
  const greeting = useGreeting();
  const weather = useWeather();
  const npm = useNpm({ poll: 30_000 });

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
