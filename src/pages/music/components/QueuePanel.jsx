/* QueuePanel — upcoming tracks from Spotify's playback queue.
 * Note: Spotify's /me/player/queue only sees Spotify Connect
 * playback. When Sonos plays a track via LAN/UPnP, Spotify isn't
 * aware of it and the queue will be empty. */
import { memo } from 'react';

export const QueuePanel = memo(function QueuePanel({ queue, onPlay, onRefresh, sonosActive }) {
  const items = queue?.queue || [];

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Up next</h2>
        <span className="panel-meta">
          {items.length} queued
          {onRefresh && (
            <button
              className="queue-refresh"
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              title="Refresh queue"
              aria-label="Refresh queue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/>
              </svg>
            </button>
          )}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="empty">
          {sonosActive
            ? 'Queue is empty here. Spotify only sees its own queue — when Sonos plays a track via LAN, the upcoming list lives on the speaker. Start a playlist or album to populate it.'
            : 'Queue is empty. Add a track or play an album/playlist to populate it.'}
        </div>
      ) : (
        <ul className="queue-list">
          {items.slice(0, 12).map((t, i) => (
            <li key={`${t?.id || t?.uri || 'q'}-${i}`}>
              <button
                className="queue-row"
                onClick={() => t?.uri && onPlay?.(t.uri)}
                title={`Play ${t?.name || ''} now`}
              >
                <span className="queue-index">{i + 1}</span>
                <div className="queue-art">
                  {t?.album?.images?.[2]?.url
                    ? <img src={t.album.images[2].url} alt="" loading="lazy" />
                    : <span className="sr-art-empty">♪</span>}
                </div>
                <div className="queue-meta">
                  <div className="queue-title">{t?.name || '—'}</div>
                  <div className="queue-sub">
                    {t?.artists?.map(a => a.name).join(', ') || ''}
                  </div>
                </div>
                {t?.duration_ms != null && (
                  <span className="queue-dur">{fmt(t.duration_ms)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

function fmt(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
