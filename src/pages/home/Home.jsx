/* ============================================================== *
 *  Arylmera — HOME
 *
 *  Real homepage. Sections:
 *   1. Hero — greeting + clock + weather + status bar
 *   2. Search — fuzzy search the SECTIONS registry
 *   3. Pages — large tiles linking to Plex / NAS / Homey / quicklinks
 *   4. Quick apps — most-used services with live mini-stats
 *   5. Network — TrueNAS interface + Pi-hole + Speedtest panels
 *   6. NAS — CPU sparkline, mem used, pool capacity bars
 *
 *  Variants (Tweaks panel, top-right):
 *   ambient  — default, generous spacing
 *   dense    — terminal-y, packed for at-a-glance
 *   playful  — large type, gradient accent on greeting
 * ============================================================== */
import { useState, useEffect, useMemo, useRef } from 'react';
import { ICONS } from '../../lib/icons.jsx';
import { SECTIONS, ALL_SERVICES } from '../../lib/services.js';
import { fmtBytes, fmtRate, fmtNum, pct, clamp } from '../../lib/format.js';
import {
  useClock, useGreeting, useWeather, useTrueNAS, useGlances, usePihole, useSpeedtest,
  usePlexSessions, useArrQueue, useServiceHealth, useNextcloud,
} from '../../lib/hooks.js';

// ─── Sparkline ──────────────────────────────────────────────────
function Spark({ data, color = "var(--ember)", w = 200, h = 28 }) {
  const path = useMemo(() => {
    if (!data || !data.length) return "";
    const min = Math.min(...data), max = Math.max(...data);
    const span = max - min || 1;
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [data, w, h]);
  if (!path) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} fillOpacity="0.12" />
    </svg>
  );
}

// ─── Mini SVG mark using ICONS registry ─────────────────────────
function Mark({ id }) {
  if (!ICONS[id]) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
  }
  return ICONS[id].svg;
}

// ─── Pages directory definition ─────────────────────────────────
const PageGlyphs = {
  media: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="26" height="20" rx="3" />
      <path d="M3 11h26 M3 21h26" opacity="0.5" />
      <path d="M7 6v20 M25 6v20" opacity="0.35" strokeDasharray="1 2.5" />
      <path d="M14 12.5 L21 16 L14 19.5 Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  storage: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="16" cy="9" rx="10" ry="3.5" />
      <path d="M6 9v6c0 1.93 4.48 3.5 10 3.5s10-1.57 10-3.5V9" />
      <path d="M6 15v6c0 1.93 4.48 3.5 10 3.5s10-1.57 10-3.5v-6" />
      <circle cx="16" cy="22" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 15 L16 5 L27 15 V26 a2 2 0 0 1-2 2 H7 a2 2 0 0 1-2-2 Z" />
      <path d="M11 28 V19 h10 v9" opacity="0.55" />
      <circle cx="22.5" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M19.5 9.5 a3 3 0 0 1 6 0 M16.5 9.5 a6 6 0 0 1 12 0" opacity="0.55" />
    </svg>
  ),
  directory: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="14" height="3" rx="1" />
      <rect x="4" y="12" width="14" height="3" rx="1" />
      <rect x="4" y="18" width="9" height="3" rx="1" />
      <circle cx="22" cy="22" r="5" />
      <path d="M26 26 L29 29" />
    </svg>
  ),
};

const PAGES = [
  {
    id: "plex", name: "Media", desc: "plex · arr · downloads",
    href: "plex.html", glyph: PageGlyphs.media,
    accent: "oklch(0.78 0.15 35)",
    accentSoft: "oklch(0.78 0.15 35 / .14)",
    pattern: "rays",
  },
  {
    id: "nas", name: "Storage", desc: "truenas · pools · disks",
    href: "nas.html", glyph: PageGlyphs.storage,
    accent: "oklch(0.78 0.10 220)",
    accentSoft: "oklch(0.78 0.10 220 / .14)",
    pattern: "grid",
  },
  {
    id: "homey", name: "Smart Home", desc: "homey · ha · automations",
    href: "homey.html", glyph: PageGlyphs.home,
    accent: "oklch(0.80 0.13 150)",
    accentSoft: "oklch(0.80 0.13 150 / .14)",
    pattern: "rings",
  },
  {
    id: "quicklinks", name: "Directory", desc: "every service · search",
    href: "quicklinks.html", glyph: PageGlyphs.directory,
    accent: "oklch(0.80 0.13 320)",
    accentSoft: "oklch(0.80 0.13 320 / .14)",
    pattern: "dots",
  },
];

const QUICK_APP_IDS = ["plex", "seerr", "sonarr", "radarr", "qbittorrent", "pihole", "homey", "homeassistant"];

// ─── Search ─────────────────────────────────────────────────────
function Search() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    const pages = PAGES.map(p => ({ ...p, _kind: "page" }))
      .filter(p => p.name.toLowerCase().includes(needle) || p.desc.toLowerCase().includes(needle));
    const svcs = ALL_SERVICES.filter(s =>
      s.name.toLowerCase().includes(needle) ||
      s.desc.toLowerCase().includes(needle) ||
      s.section.toLowerCase().includes(needle)
    ).map(s => ({ ...s, _kind: "service" }));
    return [...pages, ...svcs].slice(0, 8);
  }, [q]);

  return (
    <div className="search-wrap">
      <div className="searchbar">
        <svg className="q" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input
          ref={ref}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => clamp(a + 1, 0, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => clamp(a - 1, 0, results.length - 1)); }
            else if (e.key === "Enter" && results[active]) {
              const r = results[active];
              window.location.href = r._kind === "page" ? r.href : r.url;
            }
          }}
          placeholder="Search pages, services, anything…"
        />
        <span className="kbd">⌘K</span>
      </div>
      {q && (
        <div className="search-results">
          {results.length === 0 && <div className="search-empty">No matches</div>}
          {results.map((r, i) => (
            <a
              key={`${r._kind}-${r.id}`}
              className={`row ${i === active ? "active" : ""}`}
              href={r._kind === "page" ? r.href : r.url}
              target={r._kind === "service" ? "_blank" : undefined}
              rel={r._kind === "service" ? "noopener noreferrer" : undefined}
              onMouseEnter={() => setActive(i)}
            >
              <div className="qa-ico"><Mark id={r.icon} /></div>
              <div>
                <div className="name">{r.name}</div>
                <div className="desc">{r.desc}</div>
              </div>
              <div className="cat">{r._kind === "page" ? "page" : r.section}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page tile ──────────────────────────────────────────────────
function PageTile({ page, stats }) {
  return (
    <a
      className={`page-tile pattern-${page.pattern}`}
      href={page.href}
      style={{ "--accent": page.accent, "--accent-soft": page.accentSoft }}
    >
      <div className="page-tile-head">
        <div className="page-tile-ico">{page.glyph}</div>
        <div>
          <div className="page-tile-name">{page.name}</div>
          <div className="page-tile-desc">{page.desc}</div>
        </div>
      </div>
      <div className="page-tile-stats">
        {stats.map(s => (
          <div className="stat" key={s.label}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="page-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </div>
    </a>
  );
}

// ─── Quick app card ─────────────────────────────────────────────
function QuickApp({ svc, statusMap, statText }) {
  const reachable = statusMap[svc.id];
  const live = reachable === undefined ? svc.status : (reachable ? "up" : "down");
  return (
    <a className="quickapp" href={svc.url} target="_blank" rel="noopener noreferrer">
      <div className="qa-ico"><Mark id={svc.icon} /></div>
      <div className="qa-body">
        <div className="qa-name">
          <span className={`dot ${live}`} />
          {svc.name}
        </div>
        <div className="qa-stat">{statText}</div>
      </div>
    </a>
  );
}

// ─── Network panel ──────────────────────────────────────────────
function NetworkPanel({ nas, pi, st }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// 05</span> Network</div>
        <div className="panel-meta">live · 30s</div>
      </div>
      <div className="net-grid">
        <div className="net-card" style={{ "--accent": "var(--ember)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            Throughput
          </div>
          <div className="val">↓ {fmtRate(nas?.netRx)}</div>
          <Spark data={nas?.rxSpark || []} color="var(--ember)" />
          <div className="sub">↑ <b>{fmtRate(nas?.netTx)}</b> · eno1</div>
        </div>
        <div className="net-card" style={{ "--accent": "var(--steel)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z M3 12h18 M12 3a14 14 0 0 1 0 18" /></svg>
            DNS · Pi-hole
          </div>
          <div className="val">{fmtNum(pi?.queries)}</div>
          <div className="bar"><i style={{ width: `${pi?.pct ?? 0}%`, background: "var(--steel)" }} /></div>
          <div className="sub"><b>{pi?.pct != null ? pi.pct.toFixed(1) : "—"}%</b> blocked · <b>{fmtNum(pi?.clients)}</b> clients</div>
        </div>
        <div className="net-card" style={{ "--accent": "var(--sage)" }}>
          <div className="lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 12l4-4 M12 7v0" /></svg>
            ISP · Speedtest
          </div>
          <div className="val">{st?.down != null ? `↓ ${Math.round(st.down)}` : "—"}<small style={{ marginLeft: 4 }}>Mbps</small></div>
          <div className="sub">↑ <b>{st?.up != null ? Math.round(st.up) : "—"}</b> Mbps · <b>{st?.ping != null ? Math.round(st.ping) : "—"}</b> ms</div>
        </div>
      </div>
    </div>
  );
}

// ─── NAS panel ──────────────────────────────────────────────────
function NASPanel({ nas, state }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// 06</span> NAS</div>
        <div className="panel-meta">
          {state === "live"
            ? <a href="nas.html">open NAS →</a>
            : state === "error"
              ? <span style={{ color: "var(--status-down)" }}>offline / cors</span>
              : "loading"}
        </div>
      </div>
      <div className="nas-grid">
        <div className="nas-stat">
          <div className="lbl">CPU</div>
          <div className="val">{nas?.cpuPct != null ? `${nas.cpuPct}%` : "—"}</div>
          <Spark data={nas?.cpuSpark || []} color="var(--ember)" />
        </div>
        <div className="nas-stat">
          <div className="lbl">Memory</div>
          <div className="val">{fmtBytes(nas?.memUsed)}</div>
          <div className="sub">of <b>{fmtBytes(nas?.memTotal)}</b></div>
          <div className="bar" style={{ marginTop: 6, height: 4, background: "oklch(1 0 0 / .04)", borderRadius: 2, overflow: "hidden" }}>
            <i style={{ display: "block", height: "100%", width: `${pct(nas?.memUsed, nas?.memTotal)}%`, background: "var(--steel)" }} />
          </div>
        </div>
      </div>
      {nas?.pools?.length ? nas.pools.map(p => (
        <div className="pool-row" key={p.name}>
          <div className="top">
            <div className="name">
              <span className={`dot ${p.healthy ? "up" : "warn"}`} />
              {p.name}
            </div>
            <div className="pct">{p.pct}%</div>
          </div>
          <div className="bar"><i className={p.pct > 90 ? "crit" : p.pct > 75 ? "warn" : ""} style={{ width: `${p.pct}%` }} /></div>
          <div className="meta">{fmtBytes(p.used)} <b>used</b> · {fmtBytes(p.total - p.used)} <b>free</b></div>
        </div>
      )) : <div className="empty">no pools — set VITE_TRUENAS_URL + TRUENAS_API_KEY in .env, then restart dev server</div>}
    </div>
  );
}

// ─── Main app ───────────────────────────────────────────────────
export default function Home() {
  useEffect(() => {
    const slot = document.querySelector(".topbar-right");
    const trigger = document.querySelector(".am-trigger");
    if (slot && trigger && trigger.parentElement !== slot) {
      trigger.classList.remove("am-floating");
      slot.appendChild(trigger);
    }
  }, []);

  const greeting = useGreeting();
  const now = useClock();
  const weather = useWeather();
  const { data: tnRaw, state: nasState } = useTrueNAS();
  const { data: glances } = useGlances();
  const nas = useMemo(() => {
    if (!tnRaw && !glances) return null;
    const gCpu = glances?.cpu?.total != null
      ? Math.round(glances.cpu.total)
      : (glances?.cpu?.idle != null ? Math.round(100 - glances.cpu.idle) : null);
    const gMemUsed = glances?.mem?.used ?? null;
    const gMemTotal = glances?.mem?.total ?? null;
    return {
      ...(tnRaw || {}),
      cpuPct: tnRaw?.cpuPct ?? gCpu,
      memUsed: tnRaw?.memUsed ?? gMemUsed,
      memTotal: tnRaw?.memTotal ?? gMemTotal,
    };
  }, [tnRaw, glances]);
  const pi = usePihole();
  const st = useSpeedtest();
  const plexN = usePlexSessions();
  const sonarrN = useArrQueue("sonarr");
  const radarrN = useArrQueue("radarr");
  const nc = useNextcloud();

  const quickApps = useMemo(() => {
    const map = Object.fromEntries(ALL_SERVICES.map(s => [s.id, s]));
    return QUICK_APP_IDS.map(id => map[id]).filter(Boolean);
  }, []);
  const healthMap = useServiceHealth(quickApps);
  const allHealth = useServiceHealth(ALL_SERVICES, 120_000);

  const onlineCount = useMemo(() => {
    return ALL_SERVICES.reduce((acc, s) => {
      const live = allHealth[s.id];
      if (live === true) return acc + 1;
      if (live === false) return acc;
      return s.status === "up" ? acc + 1 : acc;
    }, 0);
  }, [allHealth]);
  const totalServices = ALL_SERVICES.length;
  const statusClass = onlineCount === totalServices ? "" : onlineCount < totalServices * 0.8 ? "down" : "warn";

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }).toLowerCase();

  const pageStats = {
    plex: [
      { label: "streams", value: plexN ?? "—" },
      { label: "sonarr q", value: sonarrN ?? "—" },
      { label: "radarr q", value: radarrN ?? "—" },
    ],
    nas: [
      { label: "cpu", value: nas?.cpuPct != null ? `${nas.cpuPct}%` : "—" },
      { label: "mem", value: nas?.memUsed != null ? fmtBytes(nas.memUsed) : "—" },
      { label: "pools", value: nas?.pools?.length ?? "—" },
    ],
    homey: [
      { label: "dns q", value: pi.queries != null ? fmtNum(pi.queries) : "—" },
      { label: "blocked", value: pi.pct != null ? `${pi.pct.toFixed(0)}%` : "—" },
      { label: "cloud", value: nc.info?.quota?.used != null ? `${(nc.info.quota.used / 1024 ** 3).toFixed(0)} GiB` : "—" },
    ],
    quicklinks: [
      { label: "services", value: totalServices },
      { label: "online", value: onlineCount },
    ],
  };

  const qaStat = (id) => {
    if (id === "plex")       return plexN   != null ? `${plexN} streaming`         : "media · serve";
    if (id === "sonarr")     return sonarrN != null ? `${sonarrN} in queue`        : "tv · manage";
    if (id === "radarr")     return radarrN != null ? `${radarrN} in queue`        : "movies · manage";
    if (id === "pihole")     return pi.queries != null ? `${fmtNum(pi.queries)} q today` : "dns · blocklist";
    if (id === "qbittorrent")  return "downloads";
    if (id === "seerr")        return "requests";
    if (id === "homey")        return "smart home";
    if (id === "homeassistant")return "automations";
    return "";
  };

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 3 3-3 3-3-3 3-3z"/><path d="m12 15 3 3-3 3-3-3 3-3z"/><path d="m3 12 3-3 3 3-3 3-3-3z"/><path d="m15 12 3-3 3 3-3 3-3-3z"/></svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">home</span></div>
        </div>
        <div className="topbar-right">
          <div className={`statusbar ${statusClass}`}>
            <span className="dot" />
            <b>{onlineCount}</b>/{totalServices} online
          </div>
        </div>
      </div>

      <div className="hero">
        <div>
          <h1 className="greeting">{greeting}, <em>Guillaume</em>.</h1>
          <p className="greeting-sub">{onlineCount} of {totalServices} services online · last refresh just now</p>
        </div>
        <div className="hero-meta">
          <div className="hero-card">
            <div className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <div className="val">{time}</div>
              <div className="lab">{dateStr}</div>
            </div>
          </div>
          <div className="hero-card">
            <div className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            </div>
            <div>
              <div className="val">{weather.temp}°</div>
              <div className="weather-sub">{weather.desc}</div>
            </div>
          </div>
        </div>
      </div>

      <Search />

      <div className="section">
        <div className="section-head">
          <div className="section-title"><span className="numeral">// 01</span><h2>Pages</h2></div>
          <div className="section-meta">{PAGES.length} · routes</div>
        </div>
        <div className="pages-grid">
          {PAGES.map(p => <PageTile key={p.id} page={p} stats={pageStats[p.id] || []} />)}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title"><span className="numeral">// 02</span><h2>Quick apps</h2></div>
          <div className="section-meta"><a href="quicklinks.html" style={{ color: "var(--ember-hi)", textDecoration: "none" }}>all services →</a></div>
        </div>
        <div className="quickapps">
          {quickApps.map(s => <QuickApp key={s.id} svc={s} statusMap={healthMap} statText={qaStat(s.id)} />)}
        </div>
      </div>

      <div className="section">
        <div className="bottom-row">
          <NetworkPanel nas={nas} pi={pi} st={st} />
          <NASPanel nas={nas} state={nasState} />
        </div>
      </div>

    </div>
  );
}
