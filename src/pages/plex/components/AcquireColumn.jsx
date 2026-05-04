import { ServiceRow, badge } from './ServiceRow.jsx';
import { useQui } from '../../../lib/hooks.js';

const DOWN_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.5 L8 11" /><path d="M4.5 7.5 L8 11 L11.5 7.5" /><path d="M3 13 L13 13" />
  </svg>
);

function fmtSpeed(b) {
  if (!Number.isFinite(b)) return null;
  if (b < 1024) return `${b} B/s`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB/s`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB/s`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB/s`;
}

export function AcquireColumn() {
  const linkOnly = <span className="latency dim">link only</span>;
  const qui = useQui();
  const loading = qui.state === 'loading';

  return (
    <div className="plex-col">
      <div className="col-head">
        <span className="col-head-icon" aria-hidden="true">{DOWN_ICON}</span>
        <span className="num">03 · acquire</span>
        <h3>Download & index</h3>
        <span className="meta">3</span>
      </div>

      <ServiceRow icon="qui" name="Qui" desc="qBit dashboard."
        port="30318" url="https://qui.arylmera.duckdns.org"
        statusBadge={badge(qui.state)}
        stats={[
          { label: 'Active', value: loading ? null : qui.active, loading, tone: qui.active > 0 ? 'accent' : '' },
          { label: 'Total',  value: loading ? null : qui.total, loading },
          { label: 'Down',   value: loading ? null : (fmtSpeed(qui.dl) || '0 B/s'), loading },
          { label: 'Up',     value: loading ? null : (fmtSpeed(qui.up) || '0 B/s'), loading },
        ]}
      />

      <ServiceRow icon="qbittorrent" name="qBittorrent" desc="Download client."
        port="30024" url="https://torrent.arylmera.duckdns.org"
        statusBadge={linkOnly}
        stats={[{ label: 'Status', value: 'open', tone: 'accent' }]}
      />

      <ServiceRow icon="prowlarr" name="Prowlarr" desc="Indexer manager."
        port="30050" url="https://prowlarr.arylmera.duckdns.org"
        statusBadge={linkOnly}
        stats={[{ label: 'Status', value: 'open' }]}
      />
    </div>
  );
}
