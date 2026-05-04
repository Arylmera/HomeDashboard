import { ServiceRow, badge, libCount } from './ServiceRow.jsx';

function ColHead({ num, label, count, icon }) {
  return (
    <div className="col-head">
      <span className="col-head-icon" aria-hidden="true">{icon}</span>
      <span className="num">{num}</span>
      <h3>{label}</h3>
      <span className="meta">{count}</span>
    </div>
  );
}

const PLAY_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3.5 L12 8 L5 12.5 Z" />
  </svg>
);

export function WatchColumn({ plex, seerr, tautulli }) {
  return (
    <div className="plex-col">
      <ColHead num="01 · watch" label="Stream & request" count="2" icon={PLAY_ICON} />

      <ServiceRow icon="plex" name="Plex" desc="Watch movies and TV shows."
        port="32400" url="https://plex.arylmera.duckdns.org"
        statusBadge={badge(plex.state)}
        stats={[
          { label: 'Streams', value: plex.sessions?.size, loading: plex.state === 'loading', tone: 'accent' },
          { label: 'Movies',  value: libCount(plex.libraries, 'movie'), loading: plex.state === 'loading' },
          { label: 'Shows',   value: libCount(plex.libraries, 'show'),  loading: plex.state === 'loading' },
          { label: 'Albums',  value: libCount(plex.libraries, 'artist'),loading: plex.state === 'loading' },
        ]}
      />

      <ServiceRow icon="seerr" name="Seerr" desc="Request portal."
        port="30357" url="https://seerr.arylmera.duckdns.org"
        statusBadge={badge(seerr.state)}
        stats={[
          { label: 'Pending',  value: seerr.counts?.pending,   loading: seerr.state === 'loading' },
          { label: 'Approved', value: seerr.counts?.approved,  loading: seerr.state === 'loading', tone: 'up' },
          { label: 'Done',     value: seerr.counts?.available, loading: seerr.state === 'loading' },
        ]}
      />

      <ServiceRow icon="tautulli" name="Tautulli" desc="Plex monitoring."
        port="30047" url="https://tautulli.arylmera.duckdns.org"
        statusBadge={badge(tautulli.state)}
        stats={[
          { label: 'Streaming', value: tautulli.activity?.stream_count, loading: tautulli.state === 'loading', tone: 'accent' },
          { label: 'Bandwidth', value: tautulli.activity?.total_bandwidth ? `${tautulli.activity.total_bandwidth} kbps` : null, loading: tautulli.state === 'loading' },
          { label: 'Sessions',  value: tautulli.activity?.sessions?.length, loading: tautulli.state === 'loading' },
        ]}
      />
    </div>
  );
}
