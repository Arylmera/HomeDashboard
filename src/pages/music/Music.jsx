/* ============================================================== *
 *  Music page — Spotify Premium + Sonos LAN.
 *
 *  Strategy: Sonos speakers appear as Spotify Connect devices, so
 *  Spotify drives playback while the Sonos API supplies room/group
 *  context, group volume, and grouping. Both auths are server-side
 *  (tokens persist in $PREFS_DB).
 *
 *  This file is a thin orchestrator: it wires hooks, derives state,
 *  and delegates handlers to useMusicActions. Panels are memoized.
 * ============================================================== */
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  useSpotifyAuth, useSpotifyPlayback, useSpotifyDevices, useSpotifyQueue, spotify,
  useSonosAuth, useSonosHouseholds, useSonosGroups, useSonosGroupPlayback, sonos,
} from '../../lib/hooks.js';
import { AuthCards } from './components/AuthCards.jsx';
import { VinylHero } from './components/VinylHero.jsx';
import { OutputPanel } from './components/OutputPanel.jsx';
import { PlaylistsPanel } from './components/PlaylistsPanel.jsx';
import { QueuePanel } from './components/QueuePanel.jsx';
import { ToastHost } from './components/ToastHost.jsx';
import { aliasPlayers, aliasGroups, expandPlayerId } from './aliasing.js';
import { useMusicActions } from './hooks/useMusicActions.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';

export default function Music() {
  const spAuth = useSpotifyAuth();
  const soAuth = useSonosAuth();
  const spReady = spAuth.authenticated;
  const soReady = soAuth.authenticated;

  // ─── Sonos: pick first household; track selected group ─────────
  const households   = useSonosHouseholds({ enabled: soReady });
  const householdId  = households.households[0]?.id || null;
  const groups       = useSonosGroups(householdId, { enabled: soReady });

  // ─── Spotify: playback + devices + queue ───────────────────────
  const playback = useSpotifyPlayback({ enabled: spReady });
  const devices  = useSpotifyDevices({ enabled: spReady });
  const queue    = useSpotifyQueue({ enabled: spReady });

  // Optimistic transfer state — Spotify takes ~1–2s to reflect a
  // transfer in /me/player, so we shadow the active device locally.
  const [pendingDeviceId, setPendingDeviceId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const effectiveDevice = useMemo(() => {
    if (pendingDeviceId) {
      const d = devices.devices.find(x => x.id === pendingDeviceId);
      if (d) return { ...d, is_active: true };
    }
    return playback.playback?.device || null;
  }, [pendingDeviceId, devices.devices, playback.playback]);

  const playbackUnrestricted = !!effectiveDevice && !effectiveDevice.is_restricted;

  // Auto-select a Sonos group when nothing else is driving playback.
  useEffect(() => {
    if (selectedGroupId || playbackUnrestricted) return;
    const playing = groups.groups.find(g => g.playbackState === 'PLAYBACK_STATE_PLAYING');
    setSelectedGroupId(playing?.id || groups.groups[0]?.id || null);
  }, [groups.groups, selectedGroupId, playbackUnrestricted]);

  // Drop the Sonos selection when playback shifts to a non-Sonos device.
  useEffect(() => {
    if (playbackUnrestricted && selectedGroupId) setSelectedGroupId(null);
  }, [playbackUnrestricted]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupPb = useSonosGroupPlayback(selectedGroupId, {
    enabled: soReady && !!selectedGroupId,
  });

  // Display-only aliasing: collapses physical speaker pairs (e.g.
  // "Dining Room Front" + "Dining Room Back") into one logical pill.
  const aliasedPlayers = useMemo(() => aliasPlayers(groups.players), [groups.players]);
  const aliasedGroups  = useMemo(() => aliasGroups(groups.groups, aliasedPlayers), [groups.groups, aliasedPlayers]);
  const selectedGroup  = useMemo(
    () => aliasedGroups.find(g => g.id === selectedGroupId),
    [aliasedGroups, selectedGroupId],
  );

  // Wrap sonos.modifyGroup so any alias id expands to its physical
  // members. Memoized so OutputPanel/RoomGroups only re-render when
  // the alias map actually changes.
  const sonosForUI = useMemo(() => ({
    ...sonos,
    modifyGroup: (hid, gid, { addPlayerIds = [], removePlayerIds = [] } = {}) =>
      sonos.modifyGroup(hid, gid, {
        addPlayerIds:    addPlayerIds.flatMap(id => expandPlayerId(aliasedPlayers, id)),
        removePlayerIds: removePlayerIds.flatMap(id => expandPlayerId(aliasedPlayers, id)),
      }),
  }), [aliasedPlayers]);

  // Centralized cross-cutting actions — all returned handlers are
  // referentially stable while their inputs are stable.
  const actions = useMusicActions({
    selectedGroupId,
    setSelectedGroupId,
    setPendingDeviceId,
    playback,
    groupPb,
    groups,
    queue,
    devices: devices.devices,
  });

  useKeyboardShortcuts({
    enabled: spReady,
    playback,
    effectiveDevice,
    selectedGroupId,
    groupPb,
  });

  // Vinyl hero spotify shape — splice in the optimistic device.
  const vinylSpotify = useMemo(() => {
    if (!playback.playback) return null;
    return { ...playback.playback, device: effectiveDevice || playback.playback.device };
  }, [playback.playback, effectiveDevice]);

  const onHeroRefresh = useCallback(() => {
    playback.refresh();
    groupPb.refresh();
    queue.refresh();
  }, [playback, groupPb, queue]);

  const sonosActiveForQueue = !!selectedGroupId && !!effectiveDevice?.is_restricted;

  return (
    <div className="shell music-shell">
      <ToastHost />
      <PageHeader />

      {(!spReady || !soReady) && <AuthCards spAuth={spAuth} soAuth={soAuth} />}

      {spReady && (
        <>
          <div className="bento">
            <div className="bento-bg" aria-hidden />

            <div className="bento-tile bento-hero">
              <VinylHero
                spotify={vinylSpotify}
                sonos={groupPb}
                group={selectedGroup}
                queue={queue.queue}
                onSpotify={spotify}
                onSonos={sonos}
                onRefresh={onHeroRefresh}
              />
            </div>

            <div className="bento-tile bento-rooms">
              <OutputPanel
                householdId={householdId}
                groups={aliasedGroups}
                players={aliasedPlayers}
                selectedGroupId={selectedGroupId}
                devices={devices.devices}
                currentDeviceId={effectiveDevice?.id}
                onTransfer={actions.transferDevice}
                onSelect={actions.selectGroup}
                onSonos={sonosForUI}
                onRefresh={groups.refresh}
                onPlayTrack={actions.playUriOnGroup}
              />
            </div>

            <div className="bento-tile bento-devices">
              <QueuePanel
                queue={queue.queue}
                onRefresh={queue.refresh}
                sonosActive={sonosActiveForQueue}
                onPlay={actions.playUri}
              />
            </div>

            <div className="bento-tile bento-playlists">
              <PlaylistsPanel onPlay={actions.playUri} />
            </div>
          </div>

          <div className="footnote">
            Live API · Spotify Premium drives playback via Spotify Connect on Sonos · Sonos API for grouping &amp; group volume · auto-refresh: playback 5 s · groups 10 s.
          </div>
        </>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18 V6 L19 4 V16" />
              <circle cx="7" cy="18" r="2.4" fill="currentColor" stroke="none" />
              <circle cx="17" cy="16" r="2.4" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">music</span></div>
        </div>
        <div className="topbar-right">
          <a className="nav-pill" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
            <span>home</span>
          </a>
        </div>
      </div>
      <div className="eyebrow">Audio</div>
      <h1 className="page-h1">The <em>airwaves.</em></h1>
      <p className="page-lede">
        Spotify Premium drives playback over Spotify Connect; Sonos LAN handles rooms, groups, and group volume. Search a track, transfer to a room, group speakers on the fly. Discovery via SSDP — set <code>SONOS_HOSTS</code> in <code>.env</code> if your network blocks multicast.
      </p>
    </>
  );
}
