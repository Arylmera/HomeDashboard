import { useState, useEffect } from 'react';
import { spotify } from '../../../lib/hooks.js';

export function SearchPanel({ onPlay }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ tracks: [], albums: [], artists: [], playlists: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults({ tracks: [], albums: [], artists: [], playlists: [] }); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const j = await spotify.search(term, ['track', 'album', 'artist', 'playlist'], 6);
        if (!alive) return;
        setResults({
          tracks: j?.tracks?.items || [],
          albums: j?.albums?.items || [],
          artists: j?.artists?.items || [],
          playlists: j?.playlists?.items || [],
        });
      } catch {
        // ignore — keep last results
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <section className="panel search-panel">
      <div className="panel-head">
        <h2>Search</h2>
      </div>
      <input
        className="search-input"
        type="search"
        placeholder="Search Spotify…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading && <div className="search-loading">searching…</div>}
      {!q && <div className="panel-hint">Search tracks, albums, artists, or playlists. Tapping plays on the selected room.</div>}

      {results.tracks.length > 0 && (
        <Group title="Tracks">
          {results.tracks.map(t => (
            <Result
              key={t.id}
              img={t.album?.images?.[2]?.url || t.album?.images?.[0]?.url}
              title={t.name}
              sub={`${t.artists.map(a => a.name).join(', ')} · ${t.album?.name || ''}`}
              onClick={() => onPlay(t.uri)}
            />
          ))}
        </Group>
      )}
      {results.albums.length > 0 && (
        <Group title="Albums">
          {results.albums.map(a => (
            <Result
              key={a.id}
              img={a.images?.[2]?.url || a.images?.[0]?.url}
              title={a.name}
              sub={a.artists?.map(x => x.name).join(', ')}
              onClick={() => onPlay(a.uri)}
            />
          ))}
        </Group>
      )}
      {results.artists.length > 0 && (
        <Group title="Artists">
          {results.artists.map(a => (
            <Result
              key={a.id}
              img={a.images?.[2]?.url || a.images?.[0]?.url}
              title={a.name}
              sub={a.genres?.slice(0, 2).join(', ') || 'artist'}
              onClick={() => onPlay(a.uri)}
            />
          ))}
        </Group>
      )}
      {results.playlists.length > 0 && (
        <Group title="Playlists">
          {results.playlists.map(p => (
            <Result
              key={p.id}
              img={p.images?.[0]?.url}
              title={p.name}
              sub={p.owner?.display_name || 'playlist'}
              onClick={() => onPlay(p.uri)}
            />
          ))}
        </Group>
      )}
    </section>
  );
}

function Group({ title, children }) {
  return (
    <div className="search-group">
      <div className="search-group-title">{title}</div>
      <div className="search-results">{children}</div>
    </div>
  );
}

function Result({ img, title, sub, onClick }) {
  return (
    <button className="search-result" onClick={onClick}>
      <div className="sr-art">{img ? <img src={img} alt="" /> : <div className="sr-art-empty">♪</div>}</div>
      <div className="sr-meta">
        <div className="sr-title">{title}</div>
        <div className="sr-sub">{sub}</div>
      </div>
    </button>
  );
}
