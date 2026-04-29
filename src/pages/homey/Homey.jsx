/* ============================================================== *
 *  Homey — smart home overview.
 *  Live data: Pi-hole, NextCloud, Speedtest, Homey (when PAT set).
 *  Zones + flows fall back to mocks if Homey is unreachable.
 * ============================================================== */
import { useEffect, useState } from 'react';
import { fmtNum } from '../../lib/format.js';
import { usePihole, useSpeedtest, useNextcloud, useHomey } from '../../lib/hooks.js';

function useHomeyAuth() {
  const [s, setS] = useState({ authenticated: false, configured: false, expires_at: null });
  useEffect(() => {
    let alive = true;
    const run = () => fetch('/api/homey/oauth/status').then(r => r.json()).then(j => { if (alive) setS(j); }).catch(() => {});
    run();
    const id = setInterval(run, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return s;
}

const I = {
  lamp:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
  plug:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z"/></svg>,
  thermo:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>,
  sensor:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12a10 10 0 0 1 20 0"/><path d="M5 12a7 7 0 0 1 14 0"/><path d="M8.5 12a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="12" r="1"/></svg>,
  door:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg>,
  motion:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="2"/><path d="m9 20 3-6 3 4 3-1"/><path d="M5.4 13.1 9 14l2 6"/><path d="m11 9 3 3 4-2"/></svg>,
  sofa:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/><path d="M4 18v2"/><path d="M20 18v2"/></svg>,
  kitchen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M3 10h18"/><path d="M7 6.5h.01"/><path d="M7 15h.01"/></svg>,
  bed:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  office:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>,
  bath:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5H4"/><path d="M14 4h6"/><path d="M6 22v-3"/><path d="M18 22v-3"/></svg>,
  toilet:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11h14"/><path d="M19 11a7 7 0 0 1-7 7 7 7 0 0 1-7-7"/><path d="M11 18v3"/><path d="M8 21h8"/><path d="M7 11V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v7"/></svg>,
  dining:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2"/><path d="M5 11v11"/><path d="M16 11h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2Z"/><path d="M16 22V2"/></svg>,
  laundry: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M7 7h.01"/><path d="M11 7h.01"/></svg>,
  music:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  terrace: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  gear:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>,
  house:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/></svg>,
};

// Match zone name → icon by keyword (lowercased + accent-stripped).
// Order matters: more specific terms first.
function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
const ZONE_RULES = [
  [/salle\s+(de\s+|a\s+)?bain|salle\s+d['e]?eau|bathroom/, I.bath],
  [/toilette|wc/,                                          I.toilet],
  [/salle\s+a\s+manger|dining/,                            I.dining],
  [/cuisine|kitchen/,                                      I.kitchen],
  [/bu[ad]nderie|laundry/,                                 I.laundry],   // covers Budanderie typo
  [/chambre|bedroom/,                                      I.bed],
  [/bureau|office/,                                        I.office],
  [/salon|living\s*room|lounge/,                           I.sofa],
  [/terrace|terrasse|jardin|balcon|garden/,                I.terrace],
  [/music|musique/,                                        I.music],
  [/technical|technique|local\s+technique/,                I.gear],
  [/hall\s+d['e]?\s*entree|entrance|entr[ée]e/,            I.door],
  [/hall\s+de\s+nuit|night/,                               I.bed],
  [/hall|couloir|corridor/,                                I.door],
  [/home|maison/,                                          I.house],
];
function iconForZone(name) {
  const n = normalize(name);
  for (const [re, icon] of ZONE_RULES) if (re.test(n)) return icon;
  return I.sofa;
}
// Hide hidden-by-convention zones (Homey uses underscore prefix for meta).
function isHiddenZone(name) { return /^_/.test(name || ""); }

const DEV_ICON = { light: I.lamp, socket: I.plug, thermostat: I.thermo, sensor: I.sensor, door: I.door, motion: I.motion };

const MOCK_ZONES = [
  { id: "z-liv", name: "Living Room", temp: 21.8, humidity: 48, devices: [
    { id: "d1", name: "Ceiling Lamp",  type: "light",  on: true, dim: 65 },
    { id: "d2", name: "Floor Lamp",    type: "light",  on: false },
    { id: "d3", name: "TV Socket",     type: "socket", on: true, power: 42 },
    { id: "d4", name: "Multi-Sensor",  type: "sensor", reading: "21.8 °C · 48 %" },
  ]},
  { id: "z-kit", name: "Kitchen", temp: 20.5, humidity: 52, devices: [
    { id: "d5", name: "Under-cabinet", type: "light",  on: true },
    { id: "d6", name: "Coffee Maker",  type: "socket", on: false },
    { id: "d7", name: "Motion Sensor", type: "motion", reading: "clear · 12 min" },
  ]},
  { id: "z-bed", name: "Bedroom", temp: 19.1, humidity: 45, devices: [
    { id: "d8",  name: "Bedside Left",  type: "light", on: false },
    { id: "d9",  name: "Bedside Right", type: "light", on: false },
    { id: "d10", name: "Thermostat",    type: "thermostat", reading: "19.0 → 20.0 °C" },
  ]},
  { id: "z-off", name: "Office", temp: 22.1, humidity: 46, devices: [
    { id: "d11", name: "Desk Lamp",  type: "light",  on: true, dim: 80 },
    { id: "d12", name: "Monitor",    type: "socket", on: true, power: 68 },
    { id: "d13", name: "3D Printer", type: "socket", on: false },
  ]},
  { id: "z-bat", name: "Bathroom", temp: 22.8, humidity: 67, devices: [
    { id: "d14", name: "Mirror Light", type: "light",  on: false },
    { id: "d15", name: "Humidity",     type: "sensor", reading: "22.8 °C · 67 %" },
  ]},
  { id: "z-ent", name: "Entrance", temp: 18.0, humidity: 54, devices: [
    { id: "d16", name: "Front Door",  type: "door",   reading: "closed · locked" },
    { id: "d17", name: "Doorbell",    type: "motion", reading: "idle" },
    { id: "d18", name: "Porch Light", type: "light",  on: false },
  ]},
];
const MOCK_FLOWS = [
  { id: "f1", name: "Good Morning",      trigger: "07:00 · weekday",   enabled: true },
  { id: "f2", name: "Away Mode",         trigger: "all away",          enabled: true },
  { id: "f3", name: "Movie Night",       trigger: "Plex · play",       enabled: true },
  { id: "f4", name: "Sunset Lights",     trigger: "sunset -15m",       enabled: true },
  { id: "f5", name: "Goodnight",         trigger: "23:30 · all days",  enabled: true },
  { id: "f6", name: "Bathroom Humidity", trigger: "humidity > 70 %",   enabled: true },
  { id: "f7", name: "Guest Mode",        trigger: "manual",            enabled: false },
  { id: "f8", name: "Vacation Lights",   trigger: "when away · random",enabled: false },
];

const EXPAND_KEY = "homey:expandedZones";
function loadExpanded() {
  try { return new Set(JSON.parse(localStorage.getItem(EXPAND_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveExpanded(set) {
  try { localStorage.setItem(EXPAND_KEY, JSON.stringify([...set])); } catch {}
}

function Device({ d }) {
  const cls = "dev " + (d.on ? "on" : "");
  const ds = d.on === true ? "ON" : d.on === false ? "OFF" : (d.reading || "—");
  return (
    <div className={cls}>
      <div className="dico">{DEV_ICON[d.type] || I.plug}</div>
      <div className="dn">{d.name}</div>
      <div className="ds">{d.power ? `${d.power} W` : ds}</div>
      {d.on !== undefined && <div className="toggle" />}
    </div>
  );
}

export default function Homey() {
  const pi = usePihole();
  const st = useSpeedtest();
  const nc = useNextcloud();
  const homey = useHomey();
  const auth = useHomeyAuth();
  const [expanded, setExpanded] = useState(loadExpanded);
  const toggleZone = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    saveExpanded(next);
    return next;
  });

  const isLive = homey.state === "live" && homey.zones.length > 0;
  const ZONES = isLive
    ? homey.zones.filter(z => !isHiddenZone(z.name) && (z.devices?.length ?? 0) > 0)
    : MOCK_ZONES;
  const FLOWS = isLive ? homey.flows : MOCK_FLOWS;
  const FOLDERS = isLive ? (homey.folders || []) : [];

  const folderName = (id) => FOLDERS.find(f => f.id === id)?.name || null;
  const flowGroupsMap = new Map();
  for (const f of FLOWS) {
    const key = f.folder || "__none__";
    if (!flowGroupsMap.has(key)) flowGroupsMap.set(key, []);
    flowGroupsMap.get(key).push(f);
  }
  const flowGroups = [...flowGroupsMap.entries()]
    .map(([key, list]) => ({
      id: key,
      name: key === "__none__" ? "Uncategorized" : (folderName(key) || "Unknown folder"),
      flows: list,
    }))
    .sort((a, b) => {
      if (a.id === "__none__") return 1;
      if (b.id === "__none__") return -1;
      return a.name.localeCompare(b.name);
    });

  const [expandedFolders, setExpandedFolders] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("homey:expandedFolders") || "[]")); }
    catch { return new Set(); }
  });
  const toggleFolder = (id) => setExpandedFolders(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem("homey:expandedFolders", JSON.stringify([...next])); } catch {}
    return next;
  });

  const lightsOn = ZONES.reduce((s, z) => s + z.devices.filter(d => d.type === "light" && d.on).length, 0);
  const totalDevs = ZONES.reduce((s, z) => s + z.devices.length, 0);
  const totalPower = ZONES.reduce((s, z) => s + z.devices.reduce((x, d) => x + (d.power || 0), 0), 0);
  const tempZones = ZONES.filter(z => z.temp != null);
  const avgTemp = tempZones.length ? (tempZones.reduce((s, z) => s + z.temp, 0) / tempZones.length).toFixed(1) : "—";
  const flowsOn = FLOWS.filter(f => f.enabled).length;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 20 L12 4 L19 20"/><path d="M8.5 13 H15.5"/></svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">smart home · hera</span></div>
        </div>
        <div className="topbar-right">
          <a className="nav-pill" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
            <span>home</span>
          </a>
        </div>
      </div>

      <div className="eyebrow">Smart Home</div>
      <h1 className="page-h1">The <em>home.</em></h1>
      <p className="page-lede">
        {isLive
          ? <>Live from Homey via cloud OAuth · {ZONES.length} zones · {totalDevs} devices · {FLOWS.length} flows. Auto-refresh every 30s.</>
          : !auth.configured
            ? <>Homey OAuth not configured — set <code>HOMEY_CLIENT_ID</code>, <code>HOMEY_CLIENT_SECRET</code>, <code>HOMEY_REDIRECT_URI</code>, <code>HOMEY_ID</code> in <code>.env</code> and restart the dev server. Showing layout placeholders below.</>
            : !auth.authenticated
              ? <>Homey OAuth configured but not authorized yet — click "Connect Homey" below to authorize once.</>
              : homey.state === "error"
                ? <>Authorized, but Homey API is unreachable — check the cloud-routed URL or token state.</>
                : <>Connecting to Homey…</>}
      </p>

      {!isLive && (
        <div className="hint-banner">
          {auth.configured && !auth.authenticated ? (
            <>
              <b>Connect Homey:</b>{" "}
              <a href="/api/homey/oauth/login">Authorize via Athom</a>
              {" — opens the Homey login page; you'll be redirected back here."}
            </>
          ) : (
            <>
              <b>Live tiles:</b> Pi-hole · Nextcloud · Speedtest. <b>Placeholder:</b> zones &amp; flows — set up an OAuth2 app at <a href="https://tools.developer.homey.app/" target="_blank" rel="noopener noreferrer">tools.developer.homey.app</a> (Apps → New) and fill the <code>HOMEY_*</code> vars in <code>.env</code>.
            </>
          )}
        </div>
      )}

      <div className="summary">
        <div className="sum"><div className="l">Pi-hole queries</div><div className={"v " + (pi.queries != null ? "accent" : "")}>{pi.queries != null ? fmtNum(pi.queries) : "—"}</div></div>
        <div className="sum"><div className="l">Blocked</div><div className="v on">{pi.pct != null ? `${pi.pct.toFixed(1)}%` : "—"}</div></div>
        <div className="sum"><div className="l">ISP ↓</div><div className="v">{st.down != null ? `${Math.round(st.down)}` : "—"}<span className="unit">Mbps</span></div></div>
        <div className="sum"><div className="l">Nextcloud</div><div className="v">{nc.info?.quota?.used != null ? `${(nc.info.quota.used / 1024 / 1024 / 1024).toFixed(0)}` : "—"}<span className="unit">GiB</span></div></div>
        <div className="sum"><div className="l">Avg temp</div><div className="v on">{avgTemp}<span className="unit">°C</span></div></div>
      </div>

      <div className="nas-section-title">
        <span className="numeral">01 · zones</span>
        <h2>Rooms &amp; devices</h2>
        <span className="meta">{ZONES.length} zones · {totalDevs} devices · {lightsOn} on · {totalPower} W</span>
      </div>
      <div className="zones">
        {ZONES.map(z => {
          const isCollapsed = !expanded.has(z.id);
          const onCount = z.devices.filter(d => d.on).length;
          return (
            <div className={"zone" + (isCollapsed ? " collapsed" : "")} key={z.id}>
              <button
                type="button"
                className="zone-head"
                onClick={() => toggleZone(z.id)}
                aria-expanded={!isCollapsed}
                aria-controls={`zone-body-${z.id}`}
              >
                <div className="ico">{iconForZone(z.name)}</div>
                <span className="zt">{z.name}</span>
                <span className="zm">{z.devices.length} dev</span>
                <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {isCollapsed && (
                <div className="zone-summary">
                  <span className="t">{z.temp != null ? Number(z.temp).toFixed(1) : "—"}<span className="u">°C</span></span>
                  {z.humidity != null && <><span className="sep">·</span><span>{Math.round(z.humidity)}% RH</span></>}
                  <span className="sep">·</span>
                  <span className={onCount > 0 ? "lights-on" : ""}>{onCount}/{z.devices.length} on</span>
                </div>
              )}
              {!isCollapsed && (
                <div id={`zone-body-${z.id}`} className="zone-body">
                  <div className="zone-climate">
                    <div className="t">{z.temp != null ? Number(z.temp).toFixed(1) : "—"}<span className="u">°C</span></div>
                    <div className="h"><span>RH</span>{z.humidity != null ? `${Math.round(z.humidity)}%` : "—"}</div>
                  </div>
                  <div className="dev-list">
                    {z.devices.map(d => <Device d={d} key={d.id} />)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="nas-section-title">
        <span className="numeral">02 · flows</span>
        <h2>Automations</h2>
        <span className="meta">{flowsOn}/{FLOWS.length} active</span>
      </div>
      <div className="flow-groups">
        {flowGroups.map(g => {
          const isCollapsed = !expandedFolders.has(g.id);
          const onCount = g.flows.filter(f => f.enabled).length;
          return (
            <div className={"flow-group" + (isCollapsed ? " collapsed" : "")} key={g.id}>
              <button
                type="button"
                className="flow-group-head"
                onClick={() => toggleFolder(g.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="fgt">{g.name}</span>
                <span className="fgm">{onCount}/{g.flows.length} on</span>
                <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {!isCollapsed && (
                <div className="flows">
                  {g.flows.map(f => (
                    <div className={"flow " + (f.enabled ? "on" : "off")} key={f.id}>
                      <span className="ft">{f.name}</span>
                      <span className="fd">{f.trigger}</span>
                      <div className="fdot" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="footnote">
        Homey via cloud OAuth · {isLive ? "live · 30s" : auth.authenticated ? "authorized · waiting for data" : auth.configured ? <a href="/api/homey/oauth/login">connect</a> : <span className="status-down">not configured</span>}
        {auth.authenticated && <> · <a href="#" onClick={(e) => { e.preventDefault(); fetch('/api/homey/oauth/logout', { method: 'POST' }).then(() => location.reload()); }}>logout</a></>}
      </div>
    </div>
  );
}
