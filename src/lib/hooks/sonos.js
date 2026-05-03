import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

/* Sonos Cloud Control API (server-proxied at /api/sonos/control/*). */

export function useSonosAuth({ poll = 60_000 } = {}) {
  const { data, state, refresh } = usePolling(
    (signal) => getJson('/api/sonos/oauth/status', { signal }),
    { poll }
  );
  return { state, configured: data?.configured ?? false, authenticated: data?.authenticated ?? false, refresh };
}

export function useSonosHouseholds({ enabled = true } = {}) {
  const { data, state } = usePolling(
    enabled ? (signal) => getJson('/api/sonos/control/households', { signal }) : null,
    { poll: 0, deps: [enabled] }
  );
  if (!enabled) return { state: 'idle', households: [] };
  return { state, households: data?.households || [] };
}

export function useSonosGroups(householdId, { poll = 10_000, enabled = true } = {}) {
  const active = enabled && !!householdId;
  const { data, state, refresh } = usePolling(
    active
      ? (signal) => getJson(`/api/sonos/control/households/${encodeURIComponent(householdId)}/groups`, { signal })
      : null,
    { poll, deps: [householdId, active] }
  );
  if (!active) return { state: 'idle', groups: [], players: [], refresh };
  return { state, groups: data?.groups || [], players: data?.players || [], refresh };
}

export function useSonosGroupPlayback(groupId, { poll = 5_000, enabled = true } = {}) {
  const active = enabled && !!groupId;
  const { data, state, refresh } = usePolling(
    active
      ? async (signal) => {
          const enc = encodeURIComponent(groupId);
          // Promise.allSettled because individual sub-endpoints may legitimately
          // return errors mid-track-change; we still want the others to render.
          const [pb, md, vol] = await Promise.allSettled([
            getJson(`/api/sonos/control/groups/${enc}/playback`, { signal }),
            getJson(`/api/sonos/control/groups/${enc}/playbackMetadata`, { signal }),
            getJson(`/api/sonos/control/groups/${enc}/groupVolume`, { signal }),
          ]);
          return {
            playback: pb.status === 'fulfilled' ? pb.value : null,
            metadata: md.status === 'fulfilled' ? md.value : null,
            volume:   vol.status === 'fulfilled' ? vol.value : null,
          };
        }
      : null,
    { poll, deps: [groupId, active] }
  );
  if (!active) return { state: 'idle', playback: null, metadata: null, volume: null, refresh };
  return { state, playback: data?.playback ?? null, metadata: data?.metadata ?? null, volume: data?.volume ?? null, refresh };
}

async function call(method, path, body) {
  const r = await fetch(`/api/sonos/control${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

const clampVol = (v) => Math.max(0, Math.min(100, Math.round(v)));

export const sonos = {
  play:    (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/play`),
  pause:   (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/pause`),
  next:    (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/skipToNextTrack`),
  prev:    (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/skipToPreviousTrack`),
  setGroupVolume:  (groupId, vol)  => call('POST', `/groups/${encodeURIComponent(groupId)}/groupVolume`, { volume: clampVol(vol) }),
  setPlayerVolume: (playerId, vol) => call('POST', `/players/${encodeURIComponent(playerId)}/playerVolume`, { volume: clampVol(vol) }),
  modifyGroup: (householdId, groupId, { addPlayerIds = [], removePlayerIds = [] } = {}) =>
    call('POST', `/households/${encodeURIComponent(householdId)}/groups/${encodeURIComponent(groupId)}/groups/modifyGroupMembers`, { playerIdsToAdd: addPlayerIds, playerIdsToRemove: removePlayerIds }),
  createGroup: (householdId, playerIds) =>
    call('POST', `/households/${encodeURIComponent(householdId)}/groups/createGroup`, { playerIds, musicContextGroupId: null }),
  favorites: (householdId) =>
    call('GET', `/households/${encodeURIComponent(householdId)}/favorites`),
  loadFavorite: (groupId, favoriteId, { playOnCompletion = true } = {}) =>
    call('POST', `/groups/${encodeURIComponent(groupId)}/favorites`, { favoriteId, playOnCompletion }),
  playSpotify: (groupId, spotifyUri) =>
    call('POST', `/groups/${encodeURIComponent(groupId)}/playSpotify`, { spotifyUri }),
};

export async function sonosLogout() {
  const r = await fetch('/api/sonos/oauth/logout', { method: 'POST' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}
