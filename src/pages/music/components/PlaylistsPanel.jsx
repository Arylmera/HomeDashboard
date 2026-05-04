/* LibraryPanel — tabbed: Recent · Liked · Playlists · Search.
 * Tracks/playlists are draggable: drop on a Room card to play there. */
import { useState, useEffect, useRef, memo } from 'react';
import {
  useSpotifyPlaylists, useSpotifyRecent, useSpotifyLiked, spotify,
} from '../../../lib/hooks.js';

const TABS = [
  { key: 'recent',    label: 'Recent' },
  { key: 'liked',     label: 'Liked' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'search',    label: 'Search' },
];

export const PlaylistsPanel = memo(function PlaylistsPanel({ onPlay }) {
  const [tab, setTab] = useState('recent');
  const [grid, setGrid] = useState(false);

  const recent    = useSpotifyRecent();
  const liked     = useSpotifyLiked();
  const playlists = useSpotifyPlaylists();

  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], albums: [], artists: [], playlists: [] });
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (tab !== 'search') return;
    const term = q.trim();
    if (!term) { setSearchResults({ tracks: [], albums: [], artists: [], playlists: [] }); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const j = await spotify.search(term, ['track', 'album', 'artist', 'playlist'], 6);
        if (!alive) return;
        setSearchResults({
          tracks: j?.tracks?.items || [],
          albums: j?.albums?.items || [],
          artists: j?.artists?.items || [],
          playlists: j?.playlists?.items || [],
        });
      } catch { /* keep prev */ }
      finally { if (alive) setSearching(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, tab]);

  return (
    <section className="panel library-panel search-panel">
      <div className="panel-head library-head">
        <div className="library-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`library-tab ${tab === t.key ? 'on' : ''}`}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          ))}
        </div>
        {tab === 'playlists' && (
          <button
            className="library-grid-toggle"
            aria-pressed={grid}
            title={grid ? 'List view' : 'Grid view'}
            onClick={() => setGrid(g => !g)}
          >
            {grid
              ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>}
          </button>
        )}
      </div>

      {tab === 'search' && (
        <input
          className="search-input"
          type="search"
          placeholder="Search Spotify…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      {tab === 'recent'    && <RecentList    items={recent.items}    state={recent.state}    onPlay={onPlay} />}
      {tab === 'liked'     && <LikedList     items={liked.items}     state={liked.state}     onPlay={onPlay} />}
      {tab === 'playlists' && <PlaylistsList playlists={playlists.playlists} state={playlists.state} error={playlists.error} refresh={playlists.refresh} grid={grid} onPlay={onPlay} />}
      {tab === 'search'    && <SearchResults q={q} loading={searching} results={searchResults} onPlay={onPlay} />}
    </section>
  );
});

/* ─── Lists ─────────────────────────────────────────────────── */

function RecentList({ items = [], state, onPlay }) {
  if (state === 'loading' && items.length === 0) return <SkeletonRows n={6} />;
  if (state === 'error' && items.length === 0) return <ScopeNotice what="recent plays" scope="user-read-recently-played" />;
  if (items.length === 0) return <div className="empty">No recent plays.</div>;
  return (
    <div className="search-results">
      {items.map((it, idx) => it?.track && (
        <TrackRow key={`${it.track.id}-${idx}`} track={it.track} onPlay={onPlay} />
      ))}
    </div>
  );
}

function LikedList({ items = [], state, onPlay }) {
  if (state === 'loading' && items.length === 0) return <SkeletonRows n={6} />;
  if (state === 'error' && items.length === 0) return <ScopeNotice what="liked tracks" scope="user-library-read" />;
  if (items.length === 0) return <div className="empty">No liked tracks.</div>;
  return (
    <div className="search-results">
      {items.map((it, idx) => it?.track && (
        <TrackRow key={`${it.track.id}-${idx}`} track={it.track} onPlay={onPlay} />
      ))}
    </div>
  );
}

function ScopeNotice({ what, scope }) {
  return (
    <div className="empty scope-notice">
      Couldn't load {what}. New permission required ({scope}).<br/>
      <a href="/api/spotify/oauth/login" className="scope-link">Re-authorize Spotify →</a>
    </div>
  );
}

function PlaylistsList({ playlists = [], state, error, refresh, grid, onPlay }) {
  if (state === 'loading' && playlists.length === 0) {
    return grid ? <SkeletonGrid n={6} /> : <SkeletonRows n={5} />;
  }
  if (state === 'error' && playlists.length === 0) {
    return (
      <div className="empty scope-notice">
        Couldn't load playlists{error?.message ? ` (${error.message})` : ''}.<br/>
        <button className="scope-link" onClick={() => refresh?.()}>Retry</button>
        {' · '}
        <a href="/api/spotify/oauth/login" className="scope-link">Re-authorize Spotify →</a>
      </div>
    );
  }
  if (playlists.length === 0) {
    return (
      <div className="empty">
        No playlists.{' '}
        <button className="scope-link" onClick={() => refresh?.()} style={{ marginLeft: 6 }}>Refresh</button>
      </div>
    );
  }
  if (grid) {
    return (
      <div className="playlist-grid">
        {playlists.map(p => (
          <button
            key={p.id}
            className="playlist-card"
            onClick={() => onPlay(p.uri)}
            draggable
            onDragStart={(e) => setDrag(e, p.uri, p.name)}
            title={p.name}
          >
            <div className="playlist-card-art">
              {p.images?.[0]?.url
                ? <img src={p.images[0].url} alt="" loading="lazy" />
                : <div className="sr-art-empty">♪</div>}
            </div>
            <div className="playlist-card-name">{p.name}</div>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="search-results">
      {playlists.map(p => (
        <button
          key={p.id}
          className="search-result"
          onClick={() => onPlay(p.uri)}
          draggable
          onDragStart={(e) => setDrag(e, p.uri, p.name)}
        >
          <div className="sr-art">
            {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" /> : <div className="sr-art-empty">♪</div>}
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
  );
}

function SearchResults({ q, loading, results, onPlay }) {
  if (loading) return <div className="search-loading">searching…</div>;
  if (!q) return <div className="panel-hint">Search tracks, albums, artists, or playlists. Tap to play, drag onto a room.</div>;
  return (
    <>
      {results.tracks.filter(Boolean).length > 0 && (
        <Group title="Tracks">
          {results.tracks.filter(Boolean).map(t => <TrackRow key={t.id} track={t} onPlay={onPlay} />)}
        </Group>
      )}
      {results.albums.filter(Boolean).length > 0 && (
        <Group title="Albums">
          {results.albums.filter(Boolean).map(a => (
            <ContextRow key={a.id} uri={a.uri} title={a.name}
              img={a.images?.[2]?.url || a.images?.[0]?.url}
              sub={a.artists?.map(x => x.name).join(', ')}
              onPlay={onPlay}
            />
          ))}
        </Group>
      )}
      {results.artists.filter(Boolean).length > 0 && (
        <Group title="Artists">
          {results.artists.filter(Boolean).map(a => (
            <ContextRow key={a.id} uri={a.uri} title={a.name}
              img={a.images?.[2]?.url || a.images?.[0]?.url}
              sub={a.genres?.slice(0, 2).join(', ') || 'artist'}
              onPlay={onPlay}
            />
          ))}
        </Group>
      )}
      {results.playlists.filter(Boolean).length > 0 && (
        <Group title="Playlists">
          {results.playlists.filter(Boolean).map(p => (
            <ContextRow key={p.id} uri={p.uri} title={p.name}
              img={p.images?.[0]?.url}
              sub={p.owner?.display_name || 'playlist'}
              onPlay={onPlay}
            />
          ))}
        </Group>
      )}
    </>
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

/* ─── Rows ──────────────────────────────────────────────────── */

function TrackRow({ track, onPlay }) {
  const img = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url;
  const sub = `${track.artists?.map(a => a.name).join(', ')}${track.album?.name ? ' · ' + track.album.name : ''}`;
  return (
    <Row
      uri={track.uri}
      label={track.name}
      img={img}
      title={track.name}
      sub={sub}
      previewUrl={track.preview_url}
      onPlay={onPlay}
    />
  );
}

function ContextRow({ uri, title, img, sub, onPlay }) {
  return <Row uri={uri} label={title} img={img} title={title} sub={sub} onPlay={onPlay} />;
}

function Row({ uri, label, img, title, sub, previewUrl, onPlay }) {
  const audioRef = useRef(null);
  const hoverTimer = useRef(null);
  const startPreview = () => {
    if (!previewUrl) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      try {
        const a = audioRef.current = new Audio(previewUrl);
        a.volume = 0.45;
        a.play().catch(() => {});
      } catch {}
    }, 350);
  };
  const stopPreview = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }
  };
  useEffect(() => () => stopPreview(), []);
  return (
    <button
      className="search-result"
      onClick={() => onPlay(uri)}
      draggable
      onDragStart={(e) => setDrag(e, uri, label)}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
    >
      <div className="sr-art">
        {img ? <img src={img} alt="" loading="lazy" /> : <div className="sr-art-empty">♪</div>}
        {previewUrl && <span className="sr-preview-dot" aria-hidden />}
      </div>
      <div className="sr-meta">
        <div className="sr-title">{title}</div>
        <div className="sr-sub">{sub}</div>
      </div>
    </button>
  );
}

/* ─── Drag helper ───────────────────────────────────────────── */

function setDrag(e, uri, label) {
  try {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-music-track', JSON.stringify({ uri, label }));
    e.dataTransfer.setData('text/plain', uri);
  } catch {}
}

/* ─── Skeletons ─────────────────────────────────────────────── */

function SkeletonRows({ n = 5 }) {
  return (
    <div className="search-results">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="search-result skeleton">
          <div className="sr-art skel-block" />
          <div className="sr-meta">
            <div className="skel-line w70" />
            <div className="skel-line w40" />
          </div>
        </div>
      ))}
    </div>
  );
}
function SkeletonGrid({ n = 6 }) {
  return (
    <div className="playlist-grid">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="playlist-card skeleton">
          <div className="playlist-card-art skel-block" />
          <div className="skel-line w70" />
        </div>
      ))}
    </div>
  );
}
