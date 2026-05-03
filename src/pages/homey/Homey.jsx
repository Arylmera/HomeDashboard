/* ============================================================== *
 *  Homey — smart home overview.
 *  Page shell. Data + derivations live in ./useHomeyData.js,
 *  cards in ./components, helpers in ./icons.jsx.
 * ============================================================== */
import { useState, useEffect } from 'react';
import { usePersistedSet } from './usePersistedSet.js';
import { useHomeyAuth } from './useHomeyAuth.js';
import useHomeyData from './useHomeyData.js';
import { ZoneCard } from './components/ZoneCard.jsx';
import { FlowGroup } from './components/FlowGroup.jsx';
import { VariableCard } from './components/VariableCard.jsx';
import SensorDigest from './components/SensorDigest.jsx';
import Topbar from './components/Topbar.jsx';
import StatusLede from './components/StatusLede.jsx';
import SummaryTiles from './components/SummaryTiles.jsx';
import HomeyTabs from './components/HomeyTabs.jsx';

const TAB_KEY = 'homey:activeTab';

function usePersistedTab(defaultTab = 'rooms') {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || defaultTab; } catch { return defaultTab; }
  });
  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch {} }, [tab]);
  return [tab, setTab];
}

export default function Homey() {
  const auth = useHomeyAuth();
  const {
    homey, st, nc, isLive,
    zones, flows, variables, flowGroups, stats,
    onDeviceToggle, onFlowTrigger, onVariableSave,
  } = useHomeyData();
  const [expandedZones, toggleZone] = usePersistedSet('homey:expandedZones');
  const [expandedFolders, toggleFolder] = usePersistedSet('homey:expandedFolders');
  const [tab, setTab] = usePersistedTab();

  const visibleZones = zones.filter(z => z.devices.length > 0);
  const tabCounts = {
    rooms: visibleZones.length,
    flows: flows.length,
    vars:  variables.length,
  };
  const tabMetas = {
    rooms: `${stats.lightsOn} on`,
    flows: `${stats.flowsOn} active`,
    vars:  null,
  };

  return (
    <div className="shell">
      <Topbar />

      <div className="eyebrow">Smart Home</div>
      <h1 className="page-h1">The <em>home.</em></h1>
      <StatusLede isLive={isLive} auth={auth} homey={homey} zones={zones} flows={flows} stats={stats} />

      <SummaryTiles st={st} nc={nc} stats={stats} />

      <SensorDigest zones={zones} />

      <HomeyTabs tab={tab} setTab={setTab} counts={tabCounts} metas={tabMetas} />

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
