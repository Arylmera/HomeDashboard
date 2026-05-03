import { useState, useMemo } from 'react';
import { useSpotifyPlaylists } from '../../../lib/hooks.js';

export function PlaylistsPanel({ onPlay }) {
  const { state, playlists } = useSpotifyPlaylists();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter(p => p.name.toLowerCase().includes(q) || (p.owner?.display_name || '').toLowerCase().includes(q));
  }, [playlists, filter]);

  return (
    <section className="panel search-panel">
      <div className="panel-head">
        <h2>Your playlists</h2>
        <span className="panel-meta">{playlists.length} total</span>
      </div>
      <input
        className="search-input"
        type="search"
        placeholder="Filter playlists…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {state === 'loading' && <div className="search-loading">loading…</div>}
      {state === 'error' && <div className="empty">Couldn't load playlists.</div>}
      {state === 'live' && filtered.length === 0 && <div className="empty">No playlists match.</div>}

      <div className="search-results">
        {filtered.map(p => (
          <button key={p.id} className="search-result" onClick={() => onPlay(p.uri)}>
            <div className="sr-art">
              {p.images?.[0]?.url
                ? <img src={p.images[0].url} alt="" />
                : <div className="sr-art-empty">♪</div>}
            </div>
            <div className="sr-meta">
              <div className="sr-title">{p.name}</div>
              <div className="sr-sub">
                {p.owner?.display_name || 'playlist'} · {p.tracks?.total ?? '?'} tracks
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
