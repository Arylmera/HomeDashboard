import { useState, useEffect, useRef, memo } from 'react';
import { toast } from '../../../lib/toast.js';

export const RoomGroups = memo(function RoomGroups({ householdId, groups, players, selectedGroupId, onSelect, onSonos, onRefresh, onPlayTrack }) {
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragFromGroup, setDragFromGroup] = useState(null);
  const [overGroup, setOverGroup] = useState(null);
  const [openVolFor, setOpenVolFor] = useState(null); // playerId

  const playersInGroup = (g) => g.playerIds || [];

  const togglePlayer = async (group, playerId) => {
    if (busy || !householdId) return;
    setBusy(true);
    try {
      const inGroup = playersInGroup(group).includes(playerId);
      if (inGroup) {
        await onSonos.modifyGroup(householdId, group.id, { removePlayerIds: [playerId] });
      } else {
        await onSonos.modifyGroup(householdId, group.id, { addPlayerIds: [playerId] });
      }
    } finally {
      setBusy(false);
      onRefresh?.();
    }
  };

  const movePlayer = async (playerId, fromGroupId, toGroupId, playerName, toName) => {
    if (!householdId || fromGroupId === toGroupId) return;
    setBusy(true);
    try {
      if (fromGroupId) {
        await onSonos.modifyGroup(householdId, fromGroupId, { removePlayerIds: [playerId] });
      }
      await onSonos.modifyGroup(householdId, toGroupId, { addPlayerIds: [playerId] });
      toast(`Moved ${playerName || 'speaker'} → ${toName || 'group'}`);
    } finally {
      setBusy(false);
      onRefresh?.();
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Rooms &amp; groups</h2>
        <span className="panel-meta">drag pills · tap for volume</span>
      </div>
      <div className="rooms-list">
        {groups.map(g => {
          const ids = playersInGroup(g);
          const isPlaying = g.playbackState === 'PLAYBACK_STATE_PLAYING';
          const isTv = g.playbackState === 'PLAYBACK_STATE_TV';
          const stateLabel = isPlaying
            ? 'playing'
            : isTv
              ? 'tv input'
              : g.playbackState?.replace('PLAYBACK_STATE_', '').toLowerCase() || 'idle';
          const isSelected = selectedGroupId === g.id;
          return (
            <div
              key={g.id}
              className={[
                'room-group',
                isSelected ? 'selected' : '',
                isPlaying ? 'is-playing' : '',
                overGroup === g.id ? 'is-drop-target' : '',
              ].join(' ')}
              onClick={() => onSelect(g.id)}
              onDragOver={(e) => {
                const types = e.dataTransfer?.types;
                const hasTrack = types && Array.from(types).includes('application/x-music-track');
                if (dragId || hasTrack) { e.preventDefault(); setOverGroup(g.id); }
              }}
              onDragLeave={() => { if (overGroup === g.id) setOverGroup(null); }}
              onDrop={(e) => {
                e.preventDefault();
                const trackJson = e.dataTransfer.getData('application/x-music-track');
                if (trackJson) {
                  try {
                    const { uri, label } = JSON.parse(trackJson);
                    onSelect(g.id);
                    onPlayTrack?.(uri, g.id, label, g.name);
                  } catch {}
                } else if (dragId) {
                  const player = players.find(p => p.id === dragId);
                  movePlayer(dragId, dragFromGroup, g.id, player?.name, g.name);
                }
                setOverGroup(null);
                setDragId(null);
                setDragFromGroup(null);
              }}
            >
              <div className="room-head">
                <div className="room-name">
                  {g.name}
                  {isPlaying && <NowPlayingWave />}
                </div>
                <div className={`room-state ${isPlaying ? 'on' : ''} ${isTv ? 'tv' : ''}`}>
                  {stateLabel}
                </div>
              </div>
              <div className="room-players">
                {players.map(p => {
                  const inGroup = ids.includes(p.id);
                  return (
                    <PlayerPill
                      key={p.id}
                      player={p}
                      inGroup={inGroup}
                      busy={busy}
                      isVolOpen={openVolFor === p.id && inGroup}
                      onToggle={(e) => { e.stopPropagation(); togglePlayer(g, p.id); }}
                      onOpenVol={(e) => {
                        e.stopPropagation();
                        if (!inGroup) return;
                        setOpenVolFor(openVolFor === p.id ? null : p.id);
                      }}
                      onCloseVol={() => setOpenVolFor(null)}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDragId(p.id);
                        setDragFromGroup(inGroup ? g.id : null);
                        e.dataTransfer.effectAllowed = 'move';
                        try { e.dataTransfer.setData('text/plain', p.id); } catch {}
                      }}
                      onDragEnd={() => { setDragId(null); setDragFromGroup(null); setOverGroup(null); }}
                      sonos={onSonos}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && <div className="empty">No groups reported.</div>}
      </div>
    </section>
  );
});

function PlayerPill({ player, inGroup, busy, isVolOpen, onToggle, onOpenVol, onCloseVol, onDragStart, onDragEnd, sonos }) {
  // Long-press opens volume; short-tap toggles. On desktop, double-click also opens.
  const pressTimer = useRef(null);
  const pressedLong = useRef(false);
  const canVol = inGroup && !player._memberNames; // aliased pills lack a single physical id
  const onPressStart = (e) => {
    if (!canVol) return;
    pressedLong.current = false;
    pressTimer.current = setTimeout(() => {
      pressedLong.current = true;
      onOpenVol(e);
    }, 450);
  };
  const onPressEnd = (e) => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (pressedLong.current) e.stopPropagation();
  };
  const onPressCancel = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    pressedLong.current = false;
  };

  return (
    <div className={`room-pill-wrap ${isVolOpen ? 'vol-open' : ''}`}>
      <button
        className={`room-pill ${inGroup ? 'on' : ''} ${player._memberNames ? 'multi' : ''}`}
        onClick={(e) => { if (!pressedLong.current) onToggle(e); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (canVol) onOpenVol(e); }}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressCancel}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onTouchCancel={onPressCancel}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        disabled={busy}
        title={inGroup ? `${player.name} (drag to move · long-press for volume)` : `Add ${player.name}`}
      >
        <span className="room-pill-name">{player.name}</span>
        {player._memberNames && (
          <span className="room-pill-sub">{player._memberNames.join(' · ')}</span>
        )}
      </button>
      {isVolOpen && (
        <PlayerVolume player={player} sonos={sonos} onClose={onCloseVol} />
      )}
    </div>
  );
}

function PlayerVolume({ player, sonos, onClose }) {
  // Aliased ("multi") players: drive volume on the first member only,
  // since the Sonos API has no aggregate "alias" id.
  const physicalId = player.id;
  const initial = player.volume?.volume ?? 30;
  const [val, setVal] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);
  return (
    <div className="player-vol-pop" ref={ref} onClick={(e) => e.stopPropagation()}>
      <span className="player-vol-label">{player.name}</span>
      <input
        type="range" min="0" max="100" value={val}
        style={{ '--vh-vol': val }}
        onChange={(e) => setVal(+e.target.value)}
        onMouseUp={(e) => sonos.setPlayerVolume(physicalId, +e.target.value)}
        onTouchEnd={(e) => sonos.setPlayerVolume(physicalId, +e.target.value)}
      />
      <span className="player-vol-val">{val}</span>
    </div>
  );
}

function NowPlayingWave() {
  return (
    <span className="np-wave" aria-hidden>
      <span /><span /><span /><span />
    </span>
  );
}
