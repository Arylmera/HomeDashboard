/* ============================================================== *
 *  Homey — smart home overview.
 *  Live data: NextCloud, Speedtest, Homey (when PAT set).
 *  Zones + flows fall back to mocks if Homey is unreachable.
 * ============================================================== */
import { useMemo } from 'react';
import { useSpeedtest, useNextcloud, useHomey, homeySetCapability, homeyTriggerFlow, homeySetVariable } from '../../lib/hooks.js';
import { isHiddenZone } from './icons.jsx';
import { MOCK_ZONES, MOCK_FLOWS, MOCK_VARIABLES } from './mocks.js';
import { usePersistedSet } from './usePersistedSet.js';
import { useHomeyAuth } from './useHomeyAuth.js';
import { ZoneCard } from './ZoneCard.jsx';
import { FlowGroup } from './FlowGroup.jsx';
import { VariableCard } from './VariableCard.jsx';

export default function Homey() {
  const st = useSpeedtest();
  const nc = useNextcloud();
  const homey = useHomey();
  const auth = useHomeyAuth();
  const [expandedZones, toggleZone] = usePersistedSet("homey:expandedZones");
  const [expandedFolders, toggleFolder] = usePersistedSet("homey:expandedFolders");

  const isLive = homey.state === "live" && homey.zones.length > 0;

  const onDeviceToggle = async (device) => {
    try {
      await homeySetCapability(device.id, 'onoff', !device.on);
      homey.refresh();
    } catch (e) { console.warn('[homey toggle]', e); }
  };
  const onFlowTrigger = async (flow) => {
    try {
      await homeyTriggerFlow(flow.id, flow.type);
    } catch (e) { console.warn('[homey trigger]', e); throw e; }
  };
  const onVariableSave = async (id, value) => {
    try {
      await homeySetVariable(id, value);
      homey.refresh();
    } catch (e) { console.warn('[homey variable]', e); throw e; }
  };

  const ZONES = useMemo(() => isLive
    ? homey.zones.filter(z => !isHiddenZone(z.name))
    : MOCK_ZONES, [isLive, homey.zones]);
  const FLOWS = isLive ? homey.flows : MOCK_FLOWS;
  const FOLDERS = isLive ? (homey.folders || []) : [];
  const VARIABLES = useMemo(() => {
    const list = isLive ? (homey.variables || []) : MOCK_VARIABLES;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [isLive, homey.variables]);

  const flowGroups = useMemo(() => {
    const folderName = (id) => FOLDERS.find(f => f.id === id)?.name || null;
    const map = new Map();
    for (const f of FLOWS) {
      const key = f.folder || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return [...map.entries()]
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
  }, [FLOWS, FOLDERS]);

  const stats = useMemo(() => {
    const lightsOn = ZONES.reduce((s, z) => s + z.devices.filter(d => d.type === "light" && d.on).length, 0);
    const totalDevs = ZONES.reduce((s, z) => s + z.devices.length, 0);
    const totalPower = ZONES.reduce((s, z) => s + z.devices.reduce((x, d) => x + (d.power || 0), 0), 0);
    const tempZones = ZONES.filter(z => z.temp != null);
    const avgTemp = tempZones.length ? (tempZones.reduce((s, z) => s + z.temp, 0) / tempZones.length).toFixed(1) : "—";
    const humZones = ZONES.filter(z => z.humidity != null);
    const avgHum = humZones.length ? Math.round(humZones.reduce((s, z) => s + z.humidity, 0) / humZones.length) : "—";
    const flowsOn = FLOWS.filter(f => f.enabled).length;
    return { lightsOn, totalDevs, totalPower, avgTemp, avgHum, flowsOn };
  }, [ZONES, FLOWS]);

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
          ? <>Live from Homey via cloud OAuth · {ZONES.length} zones · {stats.totalDevs} devices · {FLOWS.length} flows. Auto-refresh every 30s.</>
          : !auth.configured
            ? <>Homey OAuth not configured. Set <code>HOMEY_CLIENT_ID</code>, <code>HOMEY_CLIENT_SECRET</code>, <code>HOMEY_REDIRECT_URI</code>, and <code>HOMEY_ID</code> in <code>.env</code>, then restart the dev server. Showing layout placeholders below.</>
            : !auth.authenticated
              ? <>Homey OAuth configured but not authorized yet. Click "Connect Homey" below to authorize once.</>
              : homey.state === "error"
                ? <>Authorized, but Homey API is unreachable. Check the cloud-routed URL or token state.</>
                : <>Connecting to Homey…</>}
      </p>

      {!isLive && (
        <div className="hint-banner">
          {auth.configured && !auth.authenticated ? (
            <>
              <b>Connect Homey:</b>{" "}
              <a href="/api/homey/oauth/login">Authorize via Athom</a>
              {". This opens the Homey login page; you'll be redirected back here."}
            </>
          ) : (
            <>
              <b>Live tiles:</b> Nextcloud · Speedtest. <b>Placeholder:</b> zones and flows. Set up an OAuth2 app at <a href="https://tools.developer.homey.app/" target="_blank" rel="noopener noreferrer">tools.developer.homey.app</a> (Apps, then New) and fill the <code>HOMEY_*</code> vars in <code>.env</code>.
            </>
          )}
        </div>
      )}

      <div className="summary">
        <div className="sum"><div className="l">ISP ↓</div><div className="v">{st.down != null ? `${Math.round(st.down)}` : "—"}<span className="unit">Mbps</span></div></div>
        <div className="sum"><div className="l">Nextcloud</div><div className="v">{nc.info?.quota?.used != null ? `${(nc.info.quota.used / 1024 / 1024 / 1024).toFixed(0)}` : "—"}<span className="unit">GiB</span></div></div>
        <div className="sum"><div className="l">Avg temp</div><div className="v on">{stats.avgTemp}<span className="unit">°C</span></div></div>
        <div className="sum"><div className="l">Avg humidity</div><div className="v">{stats.avgHum}<span className="unit">%</span></div></div>
        <div className="sum"><div className="l">Lights on</div><div className="v on">{stats.lightsOn}<span className="unit">on</span></div></div>
      </div>

      <div className="nas-section-title">
        <span className="numeral">01 · zones</span>
        <h2>Rooms &amp; devices</h2>
        <span className="meta">{ZONES.length} zones · {stats.totalDevs} devices · {stats.lightsOn} on · {stats.totalPower} W</span>
      </div>
      <div className="zones">
        {ZONES.map(z => (
          <ZoneCard
            key={z.id}
            zone={z}
            collapsed={!expandedZones.has(z.id)}
            onToggle={toggleZone}
            onDeviceToggle={isLive ? onDeviceToggle : null}
          />
        ))}
      </div>

      <div className="nas-section-title">
        <span className="numeral">02 · flows</span>
        <h2>Automations</h2>
        <span className="meta">{stats.flowsOn}/{FLOWS.length} active</span>
      </div>
      <div className="flow-groups">
        {flowGroups.map(g => (
          <FlowGroup
            key={g.id}
            group={g}
            collapsed={!expandedFolders.has(g.id)}
            onToggle={toggleFolder}
            onTrigger={isLive ? onFlowTrigger : null}
          />
        ))}
      </div>

      <div className="nas-section-title">
        <span className="numeral">03 · variables</span>
        <h2>Logic variables</h2>
        <span className="meta">{VARIABLES.length} variables</span>
      </div>
      <div className="variables">
        {VARIABLES.map(v => (
          <VariableCard
            key={v.id}
            variable={v}
            onSave={isLive ? onVariableSave : null}
          />
        ))}
      </div>

      <div className="footnote">
        Homey via cloud OAuth · {isLive ? "live · 30s" : auth.authenticated ? "authorized · waiting for data" : auth.configured ? <a href="/api/homey/oauth/login">connect</a> : <span className="status-down">not configured</span>}
        {auth.authenticated && <> · <a href="#" onClick={(e) => { e.preventDefault(); fetch('/api/homey/oauth/logout', { method: 'POST' }).then(() => location.reload()); }}>logout</a></>}
      </div>
    </div>
  );
}
