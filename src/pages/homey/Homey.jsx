/* ============================================================== *
 *  Homey — smart home overview.
 *  Page shell. Data + derivations live in ./useHomeyData.js,
 *  cards in ./components, helpers in ./icons.jsx, mocks.js.
 * ============================================================== */
import { useState, useEffect } from 'react';
import { usePersistedSet } from './usePersistedSet.js';
import { useHomeyAuth } from './useHomeyAuth.js';
import useHomeyData from './useHomeyData.js';
import { ZoneCard } from './components/ZoneCard.jsx';
import { FlowGroup } from './components/FlowGroup.jsx';
import { VariableCard } from './components/VariableCard.jsx';
import SensorDigest from './components/SensorDigest.jsx';

const TAB_KEY = 'homey:activeTab';
const TABS = [
  { id: 'rooms', num: '02', label: 'Rooms' },
  { id: 'flows', num: '03', label: 'Automations' },
  { id: 'vars',  num: '04', label: 'Variables' },
];

export default function Homey() {
  const auth = useHomeyAuth();
  const {
    homey, st, nc, isLive,
    zones, flows, variables, flowGroups, stats,
    onDeviceToggle, onFlowTrigger, onVariableSave,
  } = useHomeyData();
  const [expandedZones, toggleZone] = usePersistedSet('homey:expandedZones');
  const [expandedFolders, toggleFolder] = usePersistedSet('homey:expandedFolders');
  const visibleZones = zones.filter(z => z.devices.length > 0);
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || 'rooms'; } catch { return 'rooms'; }
  });
  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch {} }, [tab]);

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
          ? <>Live from Homey via cloud OAuth · {zones.length} zones · {stats.totalDevs} devices · {flows.length} flows. Auto-refresh every 30s.</>
          : !auth.configured
            ? <>Homey OAuth not configured. Set <code>HOMEY_CLIENT_ID</code>, <code>HOMEY_CLIENT_SECRET</code>, <code>HOMEY_REDIRECT_URI</code>, and <code>HOMEY_ID</code> in <code>.env</code>, then restart the dev server. Showing layout placeholders below.</>
            : !auth.authenticated
              ? <>Homey OAuth configured but not authorized yet. Click "Connect Homey" below to authorize once.</>
              : homey.state === 'error'
                ? <>Authorized, but Homey API is unreachable. Check the cloud-routed URL or token state.</>
                : <>Connecting to Homey…</>}
      </p>

      {!isLive && (
        <div className="hint-banner">
          {auth.configured && !auth.authenticated ? (
            <>
              <b>Connect Homey:</b>{' '}
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
        <div className="sum"><div className="l">ISP ↓</div><div className="v">{st.down != null ? `${Math.round(st.down)}` : '—'}<span className="unit">Mbps</span></div></div>
        <div className="sum"><div className="l">Nextcloud</div><div className="v">{nc.info?.quota?.used != null ? `${(nc.info.quota.used / 1024 / 1024 / 1024).toFixed(0)}` : '—'}<span className="unit">GiB</span></div></div>
        <div className="sum"><div className="l">Avg temp</div><div className="v on">{stats.avgTemp}<span className="unit">°C</span></div></div>
        <div className="sum"><div className="l">Avg humidity</div><div className="v">{stats.avgHum}<span className="unit">%</span></div></div>
        <div className="sum"><div className="l">Lights on</div><div className="v on">{stats.lightsOn}<span className="unit">on</span></div></div>
      </div>

      <SensorDigest zones={zones} />

      <nav className="homey-tabs" role="tablist" aria-label="Homey sections">
        {TABS.map(t => {
          const count =
            t.id === 'rooms' ? visibleZones.length :
            t.id === 'flows' ? flows.length :
            variables.length;
          const meta =
            t.id === 'rooms' ? `${stats.lightsOn} on` :
            t.id === 'flows' ? `${stats.flowsOn} active` :
            null;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              className={"homey-tab" + (tab === t.id ? ' active' : '')}
              onClick={() => setTab(t.id)}
            >
              <span className="num">{t.num}</span>
              <span className="lbl">{t.label}</span>
              <span className="cnt">{count}</span>
              {meta && <span className="meta">{meta}</span>}
            </button>
          );
        })}
      </nav>

      {tab === 'rooms' && (
        <section role="tabpanel">
          <div className="nas-section-title">
            <span className="numeral">02 · zones</span>
            <h2>Rooms &amp; devices</h2>
            <span className="meta">{visibleZones.length} zones · {stats.totalDevs} devices · {stats.lightsOn} on · {stats.totalPower} W</span>
          </div>
          <div className="zones">
            {visibleZones.map(z => (
              <ZoneCard
                key={z.id}
                zone={z}
                collapsed={!expandedZones.has(z.id)}
                onToggle={toggleZone}
                onDeviceToggle={isLive ? onDeviceToggle : null}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'flows' && (
        <section role="tabpanel">
          <div className="nas-section-title">
            <span className="numeral">03 · flows</span>
            <h2>Automations</h2>
            <span className="meta">{stats.flowsOn}/{flows.length} active</span>
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
        </section>
      )}

      {tab === 'vars' && (
        <section role="tabpanel">
          <div className="nas-section-title">
            <span className="numeral">04 · variables</span>
            <h2>Logic variables</h2>
            <span className="meta">{variables.length} variables</span>
          </div>
          <div className="variables">
            {variables.map(v => (
              <VariableCard
                key={v.id}
                variable={v}
                onSave={isLive ? onVariableSave : null}
              />
            ))}
          </div>
        </section>
      )}

      <div className="footnote">
        Homey via cloud OAuth · {isLive ? 'live · 30s' : auth.authenticated ? 'authorized · waiting for data' : auth.configured ? <a href="/api/homey/oauth/login">connect</a> : <span className="status-down">not configured</span>}
        {auth.authenticated && <> · <a href="#" onClick={(e) => { e.preventDefault(); fetch('/api/homey/oauth/logout', { method: 'POST' }).then(() => location.reload()); }}>logout</a></>}
      </div>
    </div>
  );
}
