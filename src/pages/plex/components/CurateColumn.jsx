import { ServiceRow, badge } from './ServiceRow.jsx';

export function CurateColumn({ sonarr, radarr, lidarr, abs }) {
  return (
    <div className="plex-col">
      <div className="col-head">
        <span className="num">02 · curate</span>
        <h3>Library managers</h3>
        <span className="meta">4</span>
      </div>

      <ServiceRow icon="sonarr" name="Sonarr" desc="Series management."
        port="30027" url="https://sonarr.arylmera.duckdns.org"
        statusBadge={badge(sonarr.state)}
        stats={[
          { label: 'Missing', value: sonarr.missing, loading: sonarr.state === 'loading' },
          { label: 'Queued',  value: sonarr.queue?.totalRecords, loading: sonarr.state === 'loading' },
          { label: 'Series',  value: sonarr.total, loading: sonarr.state === 'loading' },
        ]}
      />

      <ServiceRow icon="radarr" name="Radarr" desc="Movie management."
        port="30025" url="https://radarr.arylmera.duckdns.org"
        statusBadge={badge(radarr.state)}
        stats={[
          { label: 'Missing', value: radarr.missing, loading: radarr.state === 'loading' },
          { label: 'Queued',  value: radarr.queue?.totalRecords, loading: radarr.state === 'loading' },
          { label: 'Movies',  value: radarr.total, loading: radarr.state === 'loading' },
        ]}
      />

      <ServiceRow icon="lidarr" name="Lidarr" desc="Music management."
        port="30071" url="https://lidarr.arylmera.duckdns.org"
        statusBadge={badge(lidarr.state)}
        stats={[
          { label: 'Missing', value: lidarr.missing, loading: lidarr.state === 'loading' },
          { label: 'Queued',  value: lidarr.queue?.totalRecords, loading: lidarr.state === 'loading' },
          { label: 'Artists', value: lidarr.total, loading: lidarr.state === 'loading' },
        ]}
      />

      <ServiceRow icon="audiobookshelf" name="AudioBookShelf" desc="Audiobooks &amp; podcasts."
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
