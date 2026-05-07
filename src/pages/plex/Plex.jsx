/* ============================================================== *
 *  Plex page — three columns + recently-added carousel + release
 *  calendar + interactive pipeline. Single source of truth for
 *  service hooks; per-column components are pure presentation.
 * ============================================================== */
import { useMemo } from 'react';
import { usePlex, useArr, useSeerr, useTautulli, useAudiobookshelf } from '../../lib/hooks.js';
import { useUpcoming } from './calendar.js';
import { PlexProvider, usePlexUI } from './PlexContext.jsx';
import { PlexHeader } from './components/PlexHeader.jsx';
import { WatchColumn } from './components/WatchColumn.jsx';
import { CurateColumn } from './components/CurateColumn.jsx';
import { AcquireColumn } from './components/AcquireColumn.jsx';
import { ReleaseCalendar } from './components/ReleaseCalendar.jsx';
import { Pipeline } from './components/Pipeline.jsx';
import { RecentlyAdded } from './components/RecentlyAdded.jsx';

function aggregateHealth(arrs) {
  let err = 0, warn = 0;
  for (const a of arrs) {
    if (!Array.isArray(a.health)) continue;
    for (const h of a.health) {
      if (h.type === 'error') err++;
      else if (h.type === 'warning' || h.type === 'notice') warn++;
    }
  }
  if (err > 0) return { tone: 'err', label: `${err} error${err > 1 ? 's' : ''} across *arr` };
  if (warn > 0) return { tone: 'warn', label: `${warn} warning${warn > 1 ? 's' : ''} across *arr` };
  return { tone: 'ok', label: 'All checks passing' };
}

function PlexInner() {
  const { density } = usePlexUI();
  const plex     = usePlex();
  const sonarr   = useArr('sonarr');
  const radarr   = useArr('radarr');
  const lidarr   = useArr('lidarr');
  const seerr    = useSeerr();
  const tautulli = useTautulli();
  const abs      = useAudiobookshelf();

  const upcoming = useUpcoming(sonarr, radarr);
  const health = useMemo(() => aggregateHealth([sonarr, radarr, lidarr]),
    [sonarr.health, radarr.health, lidarr.health]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    request:  seerr.counts?.pending ?? null,
    index:    null,
    acquire:  (sonarr.missing ?? 0) + (radarr.missing ?? 0) + (lidarr.missing ?? 0) || null,
    download: null, // populated below
    serve:    plex.sessions?.size ?? null,
    monitor:  tautulli.activity?.stream_count ?? null,
  }), [seerr.counts, sonarr.missing, radarr.missing, lidarr.missing, plex.sessions, tautulli.activity]);

  const streams = plex.sessions?.size ?? null;

  return (
    <div className={`shell plex-shell density-${density}`}>
      <PlexHeader healthTone={health.tone} healthLabel={health.label} streams={streams} />

      <RecentlyAdded items={plex.recentlyAdded} loading={plex.state === 'loading'} />

      <div className="plex-columns">
        <WatchColumn plex={plex} seerr={seerr} tautulli={tautulli} />
        <CurateColumn sonarr={sonarr} radarr={radarr} lidarr={lidarr} abs={abs} />
        <AcquireColumn />
      </div>

      <ReleaseCalendar upcoming={upcoming} />
      <Pipeline counts={counts} />

      <div className="footnote">
        Live API · all secrets in <code>.env</code> · auto-refresh: Plex/Tautulli 30 s · arr / Seerr / ABS 60 s.
      </div>
    </div>
  );
}

export default function Plex() {
  return (
    <PlexProvider>
      <PlexInner />
    </PlexProvider>
  );
}
