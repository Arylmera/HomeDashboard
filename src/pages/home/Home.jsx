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
 * ============================================================== */
import { useEffect, useMemo } from 'react';
import { ALL_SERVICES } from '../../lib/services.js';
import { fmtBytes, fmtNum } from '../../lib/format.js';
import {
  useClock, useGreeting, useWeather, useTrueNAS, useGlances, usePihole, useSpeedtest,
  usePlexSessions, useArrQueue, useServiceHealth, useNextcloud,
} from '../../lib/hooks.js';
import { PAGES, QUICK_APP_IDS } from './pages.jsx';
import Search from './components/Search.jsx';
import PageTile from './components/PageTile.jsx';
import QuickApp from './components/QuickApp.jsx';
import NetworkPanel from './components/NetworkPanel.jsx';
import NASPanel from './components/NASPanel.jsx';

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
