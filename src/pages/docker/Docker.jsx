/* ============================================================== *
 *  Containers — live Docker view backed by Arcane API.
 *  Page shell: hero, health row + sparkline, issues jump,
 *  filter, health-sorted stack sections (collapsed when healthy).
 * ============================================================== */
import { useState } from 'react';
import { UI } from '../../lib/icons.jsx';
import { useClock, useGreeting, useWeather, useArcane } from '../../lib/hooks.js';
import FilterBar from './components/FilterBar.jsx';
import Stack from './components/Stack.jsx';
import IxSection from './components/IxSection.jsx';
import LooseSection from './components/LooseSection.jsx';
import HealthHero from './components/HealthHero.jsx';
import IssuesJump from './components/IssuesJump.jsx';
import useDockerActions from './useDockerActions.js';
import useGroupedContainers from './useGroupedContainers.js';
import useUpHistory from './useUpHistory.js';

// Arcane write actions require ARCANE_API_KEY at the proxy. Default to
// read-only; flip VITE_ARCANE_WRITE=true once a key is wired up.
const CAN_WRITE = String(import.meta.env.VITE_ARCANE_WRITE || '').toLowerCase() === 'true';

export default function Docker() {
  const now = useClock();
  const greeting = useGreeting();
  const weather = useWeather();
  const arcane = useArcane({ poll: 15_000 });

  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');

  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const { actionErr, setActionErr, writeBlocked, onContainerAction, onProjectAction } = useDockerActions(arcane);
  const readOnly = !CAN_WRITE || writeBlocked;
  const { grouped, counts, issues } = useGroupedContainers({
    containers: arcane.containers,
    projects: arcane.projects,
    q, scope,
  });
  const upHistory = useUpHistory(counts.up);
  const restartingCount = arcane.containers.filter(
    c => c.state === 'restarting' || c.state === 'paused'
  ).length;

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

      <HealthHero
        counts={counts}
        history={upHistory}
        restartingCount={restartingCount}
        infra={{
          stacks: arcane.projects.length,
          images: arcane.counts.images,
          networks: arcane.counts.networks,
          volumes: arcane.counts.volumes,
        }}
      />

      <IssuesJump issues={issues} />

      {readOnly && (
        <div className="docker-readonly-note" role="note">
          <span className="status-dot" aria-hidden="true" />
          {writeBlocked
            ? <>read-only — Arcane refused write actions (<code>403/401</code>). Configure <code>ARCANE_API_KEY</code> at the proxy to enable start/stop/restart.</>
            : <>read-only mode — set <code>VITE_ARCANE_WRITE=true</code> and provide <code>ARCANE_API_KEY</code> at the proxy to enable start/stop/restart actions.</>}
        </div>
      )}

      <FilterBar q={q} setQ={setQ} scope={scope} setScope={setScope} counts={counts} />

      {grouped.stacks.map((s, i) => (
        <Stack
          key={s.project.name}
          idx={i}
          project={s.project}
          services={s.services}
          onAction={onContainerAction}
          onProjectAction={onProjectAction}
          readOnly={readOnly}
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
          readOnly={readOnly}
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
