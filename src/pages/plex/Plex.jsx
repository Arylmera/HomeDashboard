/* ============================================================== *
 *  Plex page — three columns (Watch / Curate / Acquire) +
 *  upcoming-releases calendar pulled from Sonarr + Radarr.
 *  Live data via Vite proxies; secrets stay in .env.
 * ============================================================== */
import { usePlex, useArr, useSeerr, useTautulli, useAudiobookshelf } from '../../lib/hooks.js';
import { useUpcoming } from './calendar.js';
import { PlexHeader } from './components/PlexHeader.jsx';
import { WatchColumn } from './components/WatchColumn.jsx';
import { CurateColumn } from './components/CurateColumn.jsx';
import { AcquireColumn } from './components/AcquireColumn.jsx';
import { ReleaseCalendar } from './components/ReleaseCalendar.jsx';
import { Pipeline } from './components/Pipeline.jsx';

export default function Plex() {
  const plex     = usePlex();
  const sonarr   = useArr('sonarr');
  const radarr   = useArr('radarr');
  const lidarr   = useArr('lidarr');
  const seerr    = useSeerr();
  const tautulli = useTautulli();
  const abs      = useAudiobookshelf();

  const upcoming = useUpcoming(sonarr, radarr);

  return (
    <div className="shell plex-shell">
      <PlexHeader />

      <div className="plex-columns">
        <WatchColumn plex={plex} seerr={seerr} tautulli={tautulli} />
        <CurateColumn sonarr={sonarr} radarr={radarr} lidarr={lidarr} abs={abs} />
        <AcquireColumn />
      </div>

      <ReleaseCalendar upcoming={upcoming} />
      <Pipeline />

      <div className="footnote">
        Live API · all secrets in <code>.env</code> · auto-refresh: Plex/Tautulli 30 s · arr / Seerr / ABS 60 s.
      </div>
    </div>
  );
}
