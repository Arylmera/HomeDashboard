/* ============================================================== *
 *  Music page — Spotify Premium + Sonos Cloud.
 *
 *  Strategy: Sonos speakers appear as Spotify Connect devices, so
 *  Spotify drives playback while the Sonos API supplies room/group
 *  context, group volume, and grouping. Both auths are server-side
 *  (tokens persist in $PREFS_DB).
 * ============================================================== */
import { useState, useMemo, useEffect } from 'react';
import {
  useSpotifyAuth, useSpotifyPlayback, useSpotifyDevices, spotify,
  useSonosAuth, useSonosHouseholds, useSonosGroups, useSonosGroupPlayback, sonos,
} from '../../lib/hooks.js';
import { AuthCards } from './components/AuthCards.jsx';
import { VinylHero } from './components/VinylHero.jsx';
import { RoomGroups } from './components/RoomGroups.jsx';
import { PlaylistsPanel } from './components/PlaylistsPanel.jsx';
import { DevicePicker } from './components/DevicePicker.jsx';
import { aliasPlayers, aliasGroups, expandPlayerId } from './aliasing.js';

export default function Music() {
  const spAuth = useSpotifyAuth();
  const soAuth = useSonosAuth();

  const spReady = spAuth.authenticated;
  const soReady = soAuth.authenticated;

  // ─── Sonos: pick first household; track selected group ────────
  const households = useSonosHouseholds({ enabled: soReady });
  const householdId = households.households[0]?.id || null;
  const groups = useSonosGroups(householdId, { enabled: soReady });

  // ─── Spotify: playback + devices ──────────────────────────────
  const playback = useSpotifyPlayback({ enabled: spReady });
  const devices  = useSpotifyDevices({ enabled: spReady });

  // Optimistic transfer state — Spotify takes ~1–2s to reflect a transfer
  // in /me/player, so we shadow the active device locally for instant UI.
  const [pendingDeviceId, setPendingDeviceId] = useState(null);
  const effectiveDevice = useMemo(() => {
    if (pendingDeviceId) {
      const d = devices.devices.find(x => x.id === pendingDeviceId);
      if (d) return { ...d, is_active: true };
    }
    return playback.playback?.device || null;
  }, [pendingDeviceId, devices.devices, playback.playback]);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  // Track whether the user is currently on a non-Sonos Spotify Connect
  // device — if so, don't auto-select a Sonos room (the green outline
  // would lie about where playback is).
  const playback_unrestricted = effectiveDevice && !effectiveDevice.is_restricted;
  useEffect(() => {
    if (selectedGroupId) return;
    if (playback_unrestricted) return;
    const playing = groups.groups.find(g => g.playbackState === 'PLAYBACK_STATE_PLAYING');
    setSelectedGroupId(playing?.id || groups.groups[0]?.id || null);
  }, [groups.groups, selectedGroupId, playback_unrestricted]);

  // Drop the Sonos selection when playback shifts to a non-Sonos Connect device.
  useEffect(() => {
    if (playback_unrestricted && selectedGroupId) setSelectedGroupId(null);
  }, [playback_unrestricted]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupPb = useSonosGroupPlayback(selectedGroupId, { enabled: soReady && !!selectedGroupId });

  // Display-only aliasing (e.g. "Dining Room Front" + "Dining Room Back" → "Dining Room").
  const aliasedPlayers = useMemo(() => aliasPlayers(groups.players), [groups.players]);
  const aliasedGroups  = useMemo(() => aliasGroups(groups.groups, aliasedPlayers), [groups.groups, aliasedPlayers]);

  // Wrap sonos.modifyGroup so any alias id expands to its physical members.
  const sonosForUI = useMemo(() => ({
    ...sonos,
    modifyGroup: (hid, gid, { addPlayerIds = [], removePlayerIds = [] } = {}) => {
      const expandedAdd = addPlayerIds.flatMap(id => expandPlayerId(aliasedPlayers, id));
      const expandedRemove = removePlayerIds.flatMap(id => expandPlayerId(aliasedPlayers, id));
      return sonos.modifyGroup(hid, gid, { addPlayerIds: expandedAdd, removePlayerIds: expandedRemove });
    },
  }), [aliasedPlayers]);

  return (
    <div className="shell music-shell">
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

      {(!spReady || !soReady) && (
        <AuthCards spAuth={spAuth} soAuth={soAuth} />
      )}

      {spReady && (
        <>
          <div className="bento">
            <div className="bento-bg" aria-hidden />

            <div className="bento-tile bento-hero">
              <VinylHero
                spotify={playback.playback ? { ...playback.playback, device: effectiveDevice || playback.playback.device } : null}
                sonos={groupPb}
                group={aliasedGroups.find(g => g.id === selectedGroupId)}
                onSpotify={spotify}
                onSonos={sonos}
                onRefresh={() => { playback.refresh(); groupPb.refresh(); }}
              />
            </div>

            <div className="bento-tile bento-rooms">
              <RoomGroups
              householdId={householdId}
              groups={aliasedGroups}
              players={aliasedPlayers}
              selectedGroupId={selectedGroupId}
              onSelect={async (gid) => {
                setSelectedGroupId(gid);
                setPendingDeviceId(null);   // drop any stale device override
                // Aggressive refresh ladder so the UI catches up fast.
                const ladder = () => {
                  groupPb.refresh();
                  groups.refresh();
                  setTimeout(() => { groupPb.refresh(); groups.refresh(); }, 600);
                  setTimeout(() => { groupPb.refresh(); groups.refresh(); }, 1500);
                };
                // 1) Resume queue if any.
                try {
                  await sonos.play(gid);
                  ladder();
                  return;
                } catch { /* empty queue (701) */ }
                // 2) Empty queue → hand off Spotify's current context.
                const ctxUri = playback.playback?.context?.uri || playback.playback?.item?.uri;
                if (ctxUri) {
                  try {
                    await sonos.playSpotify(gid, ctxUri);
                    playback.refresh();
                    ladder();
                  } catch (e) {
                    console.warn('[music] handoff failed', e);
                  }
                } else {
                  ladder();
                }
              }}
                onSonos={sonosForUI}
                onRefresh={groups.refresh}
              />
            </div>

            <div className="bento-tile bento-devices">
              <DevicePicker
              devices={devices.devices}
              currentDeviceId={effectiveDevice?.id}
              onTransfer={async (id) => {
                const target = devices.devices.find(d => d.id === id);
                // Optimistic UI: pretend the new device is active immediately.
                setPendingDeviceId(id);
                if (target && !target.is_restricted) setSelectedGroupId(null);
                try {
                  await spotify.transfer(id, { play: true });
                } finally {
                  // Refresh aggressively until the API catches up, then clear the override.
                  playback.refresh();
                  setTimeout(playback.refresh, 600);
                  setTimeout(playback.refresh, 1500);
                  setTimeout(() => setPendingDeviceId(null), 2500);
                }
              }}
              />
            </div>

            <div className="bento-tile bento-playlists">
              <PlaylistsPanel
              onPlay={async (uri) => {
                const groupId = selectedGroupId;
                try {
                  // Sonos group selected → load via Sonos LAN (bypasses
                  // Spotify Web API which blocks Sonos as restricted).
                  if (groupId) {
                    await sonos.playSpotify(groupId, uri);
                    playback.refresh();
                    groupPb.refresh();
                    return;
                  }
                  // No group selected → fall back to Spotify Web API
                  // targeting whatever device is active.
                  if (uri.startsWith('spotify:track:')) {
                    await spotify.play({ uris: [uri] });
                  } else {
                    await spotify.play({ contextUri: uri });
                  }
                  playback.refresh();
                } catch (e) {
                  console.error('[music] play failed', { uri, groupId, err: e });
                  alert(`Couldn't start playback: ${e?.message || e}\n\n` +
                        `Selected group: ${groupId || '(none)'}\n\n` +
                        `If this persists, the Spotify-on-Sonos URI may need a different sn (account serial). ` +
                        `Set SONOS_SPOTIFY_SN in .env to override (default tries to discover from existing Sonos favorites).`);
                }
              }}
              />
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
