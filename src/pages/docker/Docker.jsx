/* ============================================================== *
 *  Containers — live Docker view backed by Arcane API.
 *  Page shell: hero, banner, filter, section orchestration.
 *  Cards/sections live in ./components, helpers in ./utils.js,
 *  derivations + actions in ./useGroupedContainers.js and
 *  ./useDockerActions.js.
 * ============================================================== */
import { useState } from 'react';
import { UI } from '../../lib/icons.jsx';
import { useClock, useGreeting, useWeather, useArcane } from '../../lib/hooks.js';
import FilterBar from './components/FilterBar.jsx';
import Stack from './components/Stack.jsx';
import IxSection from './components/IxSection.jsx';
import LooseSection from './components/LooseSection.jsx';
import useDockerActions from './useDockerActions.js';
import useGroupedContainers from './useGroupedContainers.js';

export default function Docker() {
  const now = useClock();
  const greeting = useGreeting();
  const weather = useWeather();
  const arcane = useArcane({ poll: 15_000 });

  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');

  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const { actionErr, setActionErr, onContainerAction, onProjectAction } = useDockerActions(arcane);
  const { grouped, counts } = useGroupedContainers({
    containers: arcane.containers,
    projects: arcane.projects,
    q, scope,
  });

  const stateLine =
    arcane.state === 'loading' ? 'Connecting to Arcane…' :
    arcane.state === 'error'   ? 'Arcane unreachable. Check VITE_ARCANE_URL / ARCANE_API_KEY.' :
    `${counts.up} of ${counts.total} containers running across ${arcane.envs.length} environment${arcane.envs.length === 1 ? '' : 's'}.`;

  const looseIdx = grouped.stacks.length + (grouped.ixStacks.length ? 2 : 1);

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
          <div className="brand-name">arylmera <span className="sub">containers · arcane</span></div>
        </div>
        <div className="topbar-right">
          <button type="button" className="nav-pill" onClick={arcane.refresh} title="refresh now">
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
          <p className="greeting-sub">
            {stateLine}
            {arcane.envName && (
              <> Host <code>{arcane.envName}</code>{' '}
                <span className={`status-dot ${arcane.envStatus === 'online' ? 'up' : 'down'}`}
                      role="img" aria-label={`host ${arcane.envStatus === 'online' ? 'online' : 'offline'}`} />.
              </>
            )}
          </p>
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
        <div className="sum"><div className="l">Running</div><div className="v on">{counts.up}<span className="unit">/ {counts.total}</span></div></div>
        <div className="sum"><div className="l">Stopped</div><div className="v">{counts.down}<span className="unit">down</span></div></div>
        <div className="sum"><div className="l">Stacks</div><div className="v">{arcane.projects.length}<span className="unit">compose</span></div></div>
        <div className="sum"><div className="l">Images</div><div className="v">{arcane.counts.images ?? '—'}<span className="unit">cached</span></div></div>
        <div className="sum"><div className="l">Networks</div><div className="v">{arcane.counts.networks ?? '—'}<span className="unit">net</span></div></div>
        <div className="sum"><div className="l">Volumes</div><div className="v">{arcane.counts.volumes ?? '—'}<span className="unit">vol</span></div></div>
      </div>

      <FilterBar q={q} setQ={setQ} scope={scope} setScope={setScope} counts={counts} />

      {grouped.stacks.map((s, i) => (
        <Stack
          key={s.project.name}
          idx={i}
          project={s.project}
          services={s.services}
          onAction={onContainerAction}
          onProjectAction={onProjectAction}
        />
      ))}

      {grouped.ixStacks.length > 0 && (
        <IxSection
          stacks={grouped.ixStacks}
          baseIdx={grouped.stacks.length}
          onAction={onContainerAction}
          onProjectAction={onProjectAction}
        />
      )}

      {grouped.loose.length > 0 && (
        <LooseSection
          containers={grouped.loose}
          idx={looseIdx}
          onAction={onContainerAction}
        />
      )}

      <div className="footbar" role="status" aria-live="polite">
        <div className="stats">
          <span aria-label={`${counts.up} containers running`}>
            <span className="status-dot up" role="img" aria-hidden="true" /><b>{counts.up}</b> running
          </span>
          <span aria-label={`${counts.down} containers stopped`}>
            <span className="status-dot down" role="img" aria-hidden="true" /><b className="stat-down-num">{counts.down}</b> stopped
          </span>
          <span aria-label={`${counts.total} total containers`}><b>{counts.total}</b> total</span>
          <span aria-label={`${arcane.projects.length} compose stacks`}><b>{arcane.projects.length}</b> stacks</span>
        </div>
        <div>arylmera · containers · {now.toISOString().slice(0, 10)}</div>
      </div>

      {actionErr && (
        <div className="docker-toast" role="alert" aria-live="assertive">
          <span>{actionErr}</span>
          <button type="button" onClick={() => setActionErr(null)} aria-label="dismiss error">dismiss</button>
        </div>
      )}
    </div>
  );
}
