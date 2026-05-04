/* Recently-added carousel. Reads from usePlex().recentlyAdded.
 * Poster URLs proxy through Plex's photo transcoder so the browser
 * never sees the raw token. */
function poster(thumb, w = 180, h = 270) {
  if (!thumb) return null;
  const u = encodeURIComponent(thumb);
  return `/api/plex/photo/:/transcode?width=${w}&height=${h}&minSize=1&upscale=1&url=${u}`;
}

const PLEX_BASE = (import.meta.env.VITE_PLEX_URL || '').replace(/\/$/, '');

function plexLink(item) {
  if (!PLEX_BASE || !item?.ratingKey) return null;
  return `${PLEX_BASE}/web/index.html#!/server//details?key=%2Flibrary%2Fmetadata%2F${item.ratingKey}`;
}

export function RecentlyAdded({ items, loading }) {
  const showSkeleton = loading && (!items || items.length === 0);
  const list = showSkeleton ? Array.from({ length: 8 }, (_, i) => ({ skeleton: true, _k: i })) : (items || []);
  if (!loading && !items?.length) return null;

  return (
    <section className="recent-strip" aria-label="Recently added to Plex">
      <div className="nas-section-title">
        <span className="numeral">new · in</span>
        <h2>Recently added</h2>
        <span className="meta">{showSkeleton ? '…' : `${items.length} latest`}</span>
      </div>
      <div className="recent-track" role="list">
        {list.map((it) => {
          if (it.skeleton) {
            return <div key={`sk-${it._k}`} className="recent-card skeleton" role="listitem" aria-hidden="true" />;
          }
          const href = plexLink(it);
          const inner = (
            <>
              <div className="recent-poster">
                <img loading="lazy" decoding="async" src={poster(it.thumb)} alt="" />
              </div>
              <div className="recent-meta">
                <div className="t" title={it.title}>{it.title}</div>
                <div className="s" title={it.sub}>{it.sub}</div>
              </div>
            </>
          );
          return href ? (
            <a key={it.ratingKey} className="recent-card linked" href={href} target="_blank" rel="noopener noreferrer" role="listitem">
              {inner}
            </a>
          ) : (
            <div key={it.ratingKey} className="recent-card" role="listitem">{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
