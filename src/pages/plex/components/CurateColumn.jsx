import { ServiceRow, badge } from './ServiceRow.jsx';
import { HealthPill } from './HealthPill.jsx';

const FOLDER_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4.5 L6 4.5 L7.5 6 L13.5 6 A.5 .5 0 0 1 14 6.5 L14 12 A.5 .5 0 0 1 13.5 12.5 L2.5 12.5 A.5 .5 0 0 1 2 12 Z" />
  </svg>
);

function missingTrend(history) {
  if (!Array.isArray(history) || history.length < 2) return null;
  return history.map((h) => h.missing);
}
function queueTrend(history) {
  if (!Array.isArray(history) || history.length < 2) return null;
  return history.map((h) => h.queue);
}

export function CurateColumn({ sonarr, radarr, lidarr, abs }) {
  return (
    <div className="plex-col">
      <div className="col-head">
        <span className="col-head-icon" aria-hidden="true">{FOLDER_ICON}</span>
        <span className="num">02 · curate</span>
        <h3>Library managers</h3>
        <span className="meta">4</span>
      </div>

      <ServiceRow icon="sonarr" name="Sonarr" desc="Series management."
        port="30027" url="https://sonarr.arylmera.duckdns.org"
        statusBadge={badge(sonarr.state)}
        extras={<HealthPill items={sonarr.health} />}
        stats={[
          { label: 'Missing', value: sonarr.missing, loading: sonarr.state === 'loading', spark: missingTrend(sonarr.history), sparkColor: 'var(--ember-hi, currentColor)' },
          { label: 'Queued',  value: sonarr.queue?.totalRecords, loading: sonarr.state === 'loading', spark: queueTrend(sonarr.history) },
          { label: 'Series',  value: sonarr.total, loading: sonarr.state === 'loading' },
        ]}
      />

      <ServiceRow icon="radarr" name="Radarr" desc="Movie management."
        port="30025" url="https://radarr.arylmera.duckdns.org"
        statusBadge={badge(radarr.state)}
        extras={<HealthPill items={radarr.health} />}
        stats={[
          { label: 'Missing', value: radarr.missing, loading: radarr.state === 'loading', spark: missingTrend(radarr.history), sparkColor: 'var(--ember-hi, currentColor)' },
          { label: 'Queued',  value: radarr.queue?.totalRecords, loading: radarr.state === 'loading', spark: queueTrend(radarr.history) },
          { label: 'Movies',  value: radarr.total, loading: radarr.state === 'loading' },
        ]}
      />

      <ServiceRow icon="lidarr" name="Lidarr" desc="Music management."
        port="30071" url="https://lidarr.arylmera.duckdns.org"
        statusBadge={badge(lidarr.state)}
        extras={<HealthPill items={lidarr.health} />}
        stats={[
          { label: 'Missing', value: lidarr.missing, loading: lidarr.state === 'loading', spark: missingTrend(lidarr.history), sparkColor: 'var(--ember-hi, currentColor)' },
          { label: 'Queued',  value: lidarr.queue?.totalRecords, loading: lidarr.state === 'loading', spark: queueTrend(lidarr.history) },
          { label: 'Artists', value: lidarr.total, loading: lidarr.state === 'loading' },
        ]}
      />

      <ServiceRow icon="audiobookshelf" name="AudioBookShelf" desc="Audiobooks & podcasts."
        port="30067" url="https://audiobookshelf.arylmera.duckdns.org"
        statusBadge={badge(abs.state)}
        stats={[
          { label: 'Libraries', value: abs.libraries?.length, loading: abs.state === 'loading' },
          { label: 'Status',    value: abs.state === 'live' ? 'ok' : null, loading: abs.state === 'loading', tone: 'up' },
        ]}
      />
    </div>
  );
}
