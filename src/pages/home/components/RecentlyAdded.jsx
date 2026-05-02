/* ============================================================== *
 *  RecentlyAdded — horizontal poster strip of newest Plex items
 *  via Tautulli's get_recently_added. Each tile links to Plex.
 *  Renders nothing if the API errored or returned empty.
 * ============================================================== */
import { useRecentlyAdded } from '../../../lib/hooks.js';

const PLEX_URL = import.meta.env.VITE_PLEX_URL || "";

function fmtAge(ms) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const d = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function RecentlyAdded() {
  const { items, state } = useRecentlyAdded({ count: 10 });
  if (state === "loading" || state === "error" || !items.length) return null;

  return (
    <div className="section">
      <div className="section-head">
        <div className="section-title"><span className="numeral">// 03</span><h2>Recently added</h2></div>
        <div className="section-meta"><a href="plex.html">on plex →</a></div>
      </div>
      <div className="recent-strip">
        {items.map(it => (
          <a className="recent-tile" key={it.key} href={PLEX_URL || "plex.html"} target="_blank" rel="noopener noreferrer">
            {it.thumb
              ? <img className="recent-thumb" src={it.thumb} alt="" loading="lazy" />
              : <div className="recent-thumb recent-thumb-fallback" aria-hidden="true" />}
            <div className="recent-meta">
              <div className="recent-title" title={it.title}>{it.title}</div>
              <div className="recent-sub">{it.year || ""}{it.year && it.addedAt ? " · " : ""}{fmtAge(it.addedAt)}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
