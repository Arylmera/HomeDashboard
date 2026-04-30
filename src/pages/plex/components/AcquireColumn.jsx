import { ServiceRow } from './ServiceRow.jsx';

export function AcquireColumn() {
  const linkOnly = <span className="latency dim">link only</span>;
  return (
    <div className="plex-col">
      <div className="col-head">
        <span className="num">03 · acquire</span>
        <h3>Download &amp; index</h3>
        <span className="meta">3</span>
      </div>

      <ServiceRow icon="qbittorrent" name="qBittorrent" desc="Download client."
        port="30024" url="https://torrent.arylmera.duckdns.org"
        statusBadge={linkOnly}
        stats={[{ label: 'Status', value: 'open', tone: 'accent' }]}
      />

      <ServiceRow icon="qui" name="Qui" desc="qBit dashboard."
        port="30318" url="https://qui.arylmera.duckdns.org"
        statusBadge={linkOnly}
        stats={[{ label: 'Status', value: 'open' }]}
      />

      <ServiceRow icon="prowlarr" name="Prowlarr" desc="Indexer manager."
        port="30050" url="https://prowlarr.arylmera.duckdns.org"
        statusBadge={linkOnly}
        stats={[{ label: 'Status', value: 'open' }]}
      />
    </div>
  );
}
