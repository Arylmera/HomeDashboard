/* ============================================================== *
 *  Network — home network overview.
 *  Page shell: composes hero, banner, filter, and sections.
 *  Filter/split logic in ./useNetworkData.js. Cards in ./components.
 * ============================================================== */
import { useNpm } from '../../lib/hooks/npm.js';
import { useWan } from '../../lib/hooks/wan.js';
import { useClock, useGreeting, useWeather } from '../../lib/hooks.js';
import { useNetworkData, npmStateLine } from './useNetworkData.js';

import NetworkTopbar from './components/NetworkTopbar.jsx';
import NetworkHero   from './components/NetworkHero.jsx';
import NetworkBanner from './components/NetworkBanner.jsx';
import FilterBar     from './components/FilterBar.jsx';
import ProxySection  from './components/ProxySection.jsx';
import CardSection   from './components/CardSection.jsx';
import RedirectCard    from './components/RedirectCard.jsx';
import DeadCard        from './components/DeadCard.jsx';
import StreamCard      from './components/StreamCard.jsx';
import CertCard        from './components/CertCard.jsx';
import AccessListCard  from './components/AccessListCard.jsx';
import SpeedtestPanel  from './components/SpeedtestPanel.jsx';
import RouterPanel     from './components/RouterPanel.jsx';

const NPM_URL = (import.meta.env.VITE_NPM_URL || '').replace(/\/+$/, '');

function NotConfigured({ state }) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <h2>{state === 'idle' ? 'Not configured' : 'Unreachable'}</h2>
        </div>
      </div>
      <p className="net-empty">
        {state === 'idle'
          ? 'Add VITE_NPM_URL, NPM_IDENTITY, NPM_SECRET to .env and restart.'
          : 'Could not reach the NPM API. Check VITE_NPM_URL and credentials.'}
      </p>
    </section>
  );
}

export default function Network() {
  const now = useClock();
  const greeting = useGreeting();
  const weather = useWeather();
  const npm = useNpm({ poll: 30_000 });
  const wan = useWan({ poll: 30_000 });

  const data = useNetworkData(npm);
  const {
    q, setQ, scope, setScope,
    certsById,
    proxyFiltered, proxySplit,
    redirFiltered, deadFiltered, streamFiltered,
    counts, certCounts, certsSorted,
  } = data;

  const sections = [];
  const push = (node) => sections.push(node);
  let idx = 0;
  const next = () => ++idx;

  push(<SpeedtestPanel key="speed"  idx={next()} />);
  push(<RouterPanel    key="router" idx={next()} />);

  if (proxyFiltered.length > 0) {
    push(<ProxySection key="proxy" idx={next()} total={proxyFiltered.length}
                       split={proxySplit} certsById={certsById} />);
  }
  if (redirFiltered.length > 0) {
    push(<CardSection key="redir" idx={next()} title="redirections" items={redirFiltered}
                      render={h => <RedirectCard key={h.id} h={h} />} />);
  }
  if (streamFiltered.length > 0) {
    push(<CardSection key="stream" idx={next()} title="streams" items={streamFiltered}
                      render={s => <StreamCard key={s.id} s={s} />} />);
  }
  if (deadFiltered.length > 0) {
    push(<CardSection key="dead" idx={next()} title="404 hosts" items={deadFiltered}
                      render={h => <DeadCard key={h.id} h={h} />} />);
  }
  if (certsSorted.length > 0) {
    push(<CardSection key="certs" idx={next()} title="certificates"
                      sub={certCounts.expired ? `${certCounts.expired} expired` : null}
                      items={certsSorted}
                      render={c => <CertCard key={c.id} c={c} />} />);
  }
  if (npm.accessLists.length > 0) {
    push(<CardSection key="acl" idx={next()} title="access lists" items={npm.accessLists}
                      render={a => <AccessListCard key={a.id} a={a} />} />);
  }

  return (
    <div className="shell">
      <NetworkTopbar npmUrl={NPM_URL} onRefresh={npm.refresh} />

      <NetworkHero
        now={now}
        greeting={greeting}
        weather={weather}
        stateLine={npmStateLine(npm)}
      />

      <NetworkBanner wan={wan} npm={npm} counts={counts} certCounts={certCounts} />

      <FilterBar q={q} setQ={setQ} scope={scope} setScope={setScope} counts={counts} />

      {(npm.state === 'idle' || npm.state === 'error') && <NotConfigured state={npm.state} />}

      {sections}

      <div className="footbar" role="status" aria-live="polite">
        <div className="stats">
          <span><span className="status-dot up"   aria-hidden="true" /><b>{counts.up}</b> online</span>
          <span><span className="status-dot down" aria-hidden="true" /><b>{counts.down}</b> offline</span>
          <span><b>{npm.proxyHosts.length}</b> proxy hosts</span>
          <span><b>{npm.certificates.length}</b> certificates</span>
        </div>
        <div>arylmera · network · {now.toISOString().slice(0, 10)}</div>
      </div>
    </div>
  );
}
