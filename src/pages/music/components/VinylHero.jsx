/* ============================================================== *
 *  VinylHero — bento centerpiece. Spinning disc, dynamic accent
 *  color extracted from album art, transport, group volume.
 *
 *  Subsumes the old NowPlaying. Keeps the same routing rules:
 *    - Sonos LAN metadata wins over Spotify Web API for the
 *      selected room (Web API can't see UPnP-driven playback).
 *    - Active Spotify device drives transport unless it's a
 *      restricted device (Sonos/Cast); then Sonos LAN handles it.
 * ============================================================== */
import { useState, useEffect, useRef, memo } from 'react';
import { useAlbumColor } from '../../../lib/useAlbumColor.js';

export const VinylHero = memo(function VinylHero({ spotify: sp, sonos: so, group, queue, onSpotify, onSonos, onRefresh }) {
  const sonosTrack = so?.metadata?.currentItem?.track;
  const sonosPlaybackState = so?.playback?.playbackState;
  const item = sp?.item;

  const sonosPlaying = sonosPlaybackState === 'PLAYBACK_STATE_PLAYING';
  const spotifyPlaying = !!sp?.is_playing;
  const useSonosMeta = !!sonosTrack?.name;
  const isPlaying = useSonosMeta ? sonosPlaying : spotifyPlaying;

  const title = sonosTrack?.name || item?.name || '—';
  const artist = sonosTrack?.artist?.name
    || item?.artists?.map(a => a.name).join(', ')
    || '';
  const album = sonosTrack?.album?.name || item?.album?.name || '';
  const art = sonosTrack?.imageUrl || item?.album?.images?.[0]?.url || null;
  const duration = useSonosMeta ? (so?.playback?.durationMs || sonosTrack?.durationMs || 0) : (item?.duration_ms || 0);
  const progress = useSonosMeta ? (so?.playback?.positionMs || 0) : (sp?.progress_ms || 0);

  const groupVolume = so?.volume?.volume ?? null;
  const muted = !!so?.volume?.muted;

  const palette = useAlbumColor(art);

  // Push palette to CSS custom props on document root so all bento tiles share it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--music-accent', palette.accent);
    root.style.setProperty('--music-accent-soft', palette.accentSoft);
    root.style.setProperty('--music-bg-grad', palette.bgGrad);
    root.style.setProperty('--music-on-accent', palette.ink);
  }, [palette]);

  const activeIsRestricted = !!sp?.device?.is_restricted;
  const useSonosTransport = activeIsRestricted && !!group;
  const handle = async (fn) => { try { await fn(); } finally { onRefresh?.(); } };
  const opt = sp?.device?.id ? { deviceId: sp.device.id } : undefined;
  const togglePlay = () => handle(() => useSonosTransport
    ? (isPlaying ? onSonos.pause(group.id) : onSonos.play(group.id))
    : (isPlaying ? onSpotify.pause(opt) : onSpotify.play(opt)));
  const next = () => handle(() => useSonosTransport ? onSonos.next(group.id) : onSpotify.next(opt));
  const prev = () => handle(() => useSonosTransport ? onSonos.prev(group.id)  : onSpotify.previous(opt));

  const activeRoom = sp?.device && !sp.device.is_restricted
    ? sp.device.name
    : (group ? group.name : (sp?.device?.name || '—'));

  // Up-next from Spotify queue (works even with Sonos meta routing).
  const upNext = queue?.queue?.[0] || null;
  const upNextLabel = upNext
    ? `${upNext.name} — ${upNext.artists?.map(a => a.name).join(', ') || ''}`
    : null;

  return (
    <section className="vinyl-hero">
      <div className="vinyl-stage">
        <ProgressRing duration={duration} progress={progress} isPlaying={isPlaying} />
        <button
          type="button"
          className={`vinyl ${isPlaying ? 'spinning' : ''}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
        >
          <div className="vinyl-disc">
            <div className="vinyl-grooves" />
            <div className="vinyl-art">
              {art ? <img src={art} alt="" crossOrigin="anonymous" /> : <div className="vinyl-art-empty">♪</div>}
              <div className="vinyl-spindle" />
            </div>
          </div>
          <div className="vinyl-glow" />
        </button>
      </div>

      <div className="vinyl-meta">
        <div className="vinyl-room">
          <span className="dot" />
          {activeRoom}
        </div>

        <div className="vinyl-title-row">
          <Marquee text={title} className="vinyl-title" />
          {isPlaying && <EqBars />}
        </div>

        <div className="vinyl-artist" title={`${artist}${album ? ' · ' + album : ''}`}>
          {artist}{album && <span className="vinyl-album"> · {album}</span>}
        </div>

        <Progress duration={duration} progress={progress} isPlaying={isPlaying} />

        <div className="vinyl-controls">
          <button onClick={prev} className="vh-btn" aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM9.5 12l8.5 6V6z"/></svg>
          </button>
          <button onClick={togglePlay} className="vh-btn vh-btn-primary" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying
              ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <button onClick={next} className="vh-btn" aria-label="Next">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
          </button>
        </div>

        {upNextLabel && (
          <div className="vh-upnext" aria-label="Up next">
            <span className="vh-upnext-label">up next</span>
            <span className="vh-upnext-text">{upNextLabel}</span>
          </div>
        )}

        {group ? (
          <VolumeRow
            value={groupVolume}
            muted={muted}
            onChange={(v) => handle(() => onSonos.setGroupVolume(group.id, v))}
          />
        ) : sp?.device ? (
          <VolumeRow
            value={sp.device.volume_percent ?? 0}
            muted={false}
            onChange={(v) => handle(() => onSpotify.setVolume(v, opt))}
          />
        ) : null}
      </div>
    </section>
  );
});

function ProgressRing({ duration, progress, isPlaying }) {
  const [now, setNow] = useState(progress);
  useEffect(() => {
    setNow(progress);
    if (!isPlaying || !duration) return;
    const id = setInterval(() => setNow((p) => Math.min(p + 1000, duration)), 1000);
    return () => clearInterval(id);
  }, [progress, isPlaying, duration]);
  if (!duration) return null;
  const pct = Math.max(0, Math.min(1, now / duration));
  const r = 49;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  return (
    <svg className="vinyl-ring" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r={r} className="vinyl-ring-track" />
      <circle
        cx="50" cy="50" r={r}
        className="vinyl-ring-fill"
        strokeDasharray={c}
        strokeDashoffset={off}
      />
    </svg>
  );
}

function Progress({ duration, progress, isPlaying }) {
  const [now, setNow] = useState(progress);
  useEffect(() => {
    setNow(progress);
    if (!isPlaying || !duration) return;
    const id = setInterval(() => setNow((p) => Math.min(p + 1000, duration)), 1000);
    return () => clearInterval(id);
  }, [progress, isPlaying, duration]);

  if (!duration) return null;
  const pct = Math.max(0, Math.min(100, (now / duration) * 100));
  return (
    <div className="vh-progress">
      <span className="vh-time">{fmt(now)}</span>
      <div className="vh-bar"><div className="vh-bar-fill" style={{ width: `${pct}%` }} /></div>
      <span className="vh-time">{fmt(duration)}</span>
    </div>
  );
}

function EqBars() {
  return (
    <span className="vh-eq" aria-hidden>
      <span /><span /><span /><span />
    </span>
  );
}

function Marquee({ text, className = '' }) {
  // Conditionally scroll only if the text overflows its container.
  const wrap = useRef(null);
  const inner = useRef(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const w = wrap.current, i = inner.current;
    if (!w || !i) return;
    setOverflow(i.scrollWidth > w.clientWidth + 2);
  }, [text]);
  return (
    <div ref={wrap} className={`marquee ${overflow ? 'is-overflow' : ''} ${className}`} title={text}>
      <span ref={inner} className="marquee-inner">
        <span className="marquee-text">{text}</span>
        {overflow && <span className="marquee-text" aria-hidden>{text}</span>}
      </span>
    </div>
  );
}

function VolumeRow({ value, muted, onChange }) {
  const [local, setLocal] = useState(value ?? 0);
  useEffect(() => { if (value != null) setLocal(value); }, [value]);
  return (
    <div className="vh-volume">
      <svg className="vh-vol-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        {muted
          ? <path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3L19 9.41 17.59 8 15 10.59 12.41 8 11 9.41 13.59 12 11 14.59 12.41 16 15 13.41 17.59 16 19 14.59z"/>
          : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z"/>}
      </svg>
      <input
        type="range" min="0" max="100" value={local}
        style={{ '--vh-vol': local }}
        onChange={(e) => setLocal(+e.target.value)}
        onMouseUp={(e) => onChange(+e.target.value)}
        onTouchEnd={(e) => onChange(+e.target.value)}
      />
      <span className="vh-vol-val">{local}</span>
    </div>
  );
}

function fmt(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
