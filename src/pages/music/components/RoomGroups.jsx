import { useState } from 'react';

export function RoomGroups({ householdId, groups, players, selectedGroupId, onSelect, onSonos, onRefresh }) {
  const [busy, setBusy] = useState(false);

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

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Rooms &amp; groups</h2>
      </div>
      <div className="rooms-list">
        {groups.map(g => {
          const ids = playersInGroup(g);
          const isPlaying = g.playbackState === 'PLAYBACK_STATE_PLAYING';
          const isTv = g.playbackState === 'PLAYBACK_STATE_TV';
          const stateLabel = isPlaying
            ? '▶ playing'
            : isTv
              ? 'tv input'
              : g.playbackState?.replace('PLAYBACK_STATE_', '').toLowerCase() || 'idle';
          return (
            <div
              key={g.id}
              className={`room-group ${selectedGroupId === g.id ? 'selected' : ''}`}
              onClick={() => onSelect(g.id)}
            >
              <div className="room-head">
                <div className="room-name">{g.name}</div>
                <div className={`room-state ${isPlaying ? 'on' : ''} ${isTv ? 'tv' : ''}`}>
                  {stateLabel}
                </div>
              </div>
              <div className="room-players">
                {players.map(p => {
                  const inGroup = ids.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      className={`room-pill ${inGroup ? 'on' : ''} ${p._memberNames ? 'multi' : ''}`}
                      onClick={(e) => { e.stopPropagation(); togglePlayer(g, p.id); }}
                      disabled={busy}
                      title={inGroup ? `Remove ${p.name} from group` : `Add ${p.name} to group`}
                    >
                      <span className="room-pill-name">{p.name}</span>
                      {p._memberNames && (
                        <span className="room-pill-sub">{p._memberNames.join(' · ')}</span>
                      )}
                    </button>
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
}
