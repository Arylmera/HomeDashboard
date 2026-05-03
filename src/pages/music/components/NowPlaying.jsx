import { useState, useEffect } from 'react';

export function NowPlaying({ spotify: sp, sonos: so, group, spotifyDeviceId, onSpotify, onSonos, onRefresh }) {
  // Prefer Sonos LAN metadata for the selected room (Spotify Web API
  // doesn't see playback that goes through Sonos UPnP). Fall back to
  // Spotify only when Sonos has nothing.
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
  const art = sonosTrack?.imageUrl || item?.album?.images?.[0]?.url;
  const duration = useSonosMeta ? (so?.playback?.durationMs || sonosTrack?.durationMs || 0) : (item?.duration_ms || 0);
  const progress = useSonosMeta ? (so?.playback?.positionMs || 0) : (sp?.progress_ms || 0);

  const groupVolume = so?.volume?.volume ?? null;
  const muted = !!so?.volume?.muted;

  // Transport routing — based on the *active* Spotify device, not the
  // selected Sonos group. Spotify reports `device.is_restricted = true`
  // for Sonos / Cast / Chromecast devices that the Web API can't control;
  // for those we use Sonos LAN. Everything else (computers, phones)
  // uses Spotify Web API.
  const activeIsRestricted = !!sp?.device?.is_restricted;
  const useSonosTransport = activeIsRestricted && !!group;
  const handle = async (fn) => { try { await fn(); } finally { onRefresh?.(); } };
  const opt = sp?.device?.id ? { deviceId: sp.device.id } : undefined;
  const togglePlay = () => handle(() => useSonosTransport
    ? (isPlaying ? onSonos.pause(group.id) : onSonos.play(group.id))
    : (isPlaying ? onSpotify.pause(opt) : onSpotify.play(opt)));
  const next = () => handle(() => useSonosTransport ? onSonos.next(group.id) : onSpotify.next(opt));
  const prev = () => handle(() => useSonosTransport ? onSonos.prev(group.id)  : onSpotify.previous(opt));

  return (
    <section className="now-playing">
      <div className="np-art">
        {art ? <img src={art} alt="" /> : <div className="np-art-empty">♪</div>}
      </div>
      <div className="np-meta">
        <div className="np-room">{
          // Active Spotify device wins when it's not Sonos. For Sonos
          // playback (restricted device), use the selected group name.
          sp?.device && !sp.device.is_restricted
            ? sp.device.name
            : (group ? group.name : (sp?.device?.name || '—'))
        }</div>
        <div className="np-title">{title}</div>
        <div className="np-artist">{artist}{album && <span className="np-album"> · {album}</span>}</div>

        <Progress duration={duration} progress={progress} isPlaying={isPlaying} />

        <div className="np-controls">
          <button onClick={prev} className="np-btn" aria-label="Previous">⏮</button>
          <button onClick={togglePlay} className="np-btn np-btn-primary" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={next} className="np-btn" aria-label="Next">⏭</button>
        </div>

        {group && (
          <VolumeRow
            value={groupVolume}
            muted={muted}
            onChange={(v) => handle(() => onSonos.setGroupVolume(group.id, v))}
          />
        )}
      </div>
    </section>
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
    <div className="np-progress">
      <span className="np-time">{fmt(now)}</span>
      <div className="np-bar"><div className="np-bar-fill" style={{ width: `${pct}%` }} /></div>
      <span className="np-time">{fmt(duration)}</span>
    </div>
  );
}

function VolumeRow({ value, muted, onChange }) {
  const [local, setLocal] = useState(value ?? 0);
  useEffect(() => { if (value != null) setLocal(value); }, [value]);
  return (
    <div className="np-volume">
      <span className="np-vol-icon">{muted ? '🔇' : '🔊'}</span>
      <input
        type="range" min="0" max="100" value={local}
        onChange={(e) => setLocal(+e.target.value)}
        onMouseUp={(e) => onChange(+e.target.value)}
        onTouchEnd={(e) => onChange(+e.target.value)}
      />
      <span className="np-vol-val">{local}</span>
    </div>
  );
}

function fmt(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
