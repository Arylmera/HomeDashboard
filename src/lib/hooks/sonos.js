import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

/* Sonos Cloud Control API (server-proxied at /api/sonos/control/*).
 *
 * Useful endpoints:
 *   GET  /households                           list households
 *   GET  /households/{hid}/groups              groups + players (rooms)
 *   POST /groups/{gid}/playback/play | pause | skipToNextTrack | ...
 *   POST /groups/{gid}/groupVolume             { volume: 0..100 }
 *   POST /groups/{gid}/playbackMetadata        for ad-hoc audio (SMAPI partners)
 *   POST /households/{hid}/groups/createGroup  modify group membership
 */

export function useSonosAuth({ poll = 60_000 } = {}) {
  const [data, setData] = useState({ state: 'loading', configured: false, authenticated: false });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson('/api/sonos/oauth/status');
        if (alive) setData({ state: 'live', ...j });
      } catch {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, tick]);
  return { ...data, refresh };
}

export function useSonosHouseholds({ enabled = true } = {}) {
  const [data, setData] = useState({ state: 'loading', households: [] });
  useEffect(() => {
    if (!enabled) { setData({ state: 'idle', households: [] }); return; }
    let alive = true;
    (async () => {
      try {
        const j = await getJson('/api/sonos/control/households');
        if (alive) setData({ state: 'live', households: j.households || [] });
      } catch {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    })();
    return () => { alive = false; };
  }, [enabled]);
  return data;
}

export function useSonosGroups(householdId, { poll = 10_000, enabled = true } = {}) {
  const [data, setData] = useState({ state: 'loading', groups: [], players: [] });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    if (!enabled || !householdId) { setData({ state: 'idle', groups: [], players: [] }); return; }
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson(`/api/sonos/control/households/${encodeURIComponent(householdId)}/groups`);
        if (alive) setData({ state: 'live', groups: j.groups || [], players: j.players || [] });
      } catch {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [householdId, poll, tick, enabled]);
  return { ...data, refresh };
}

export function useSonosGroupPlayback(groupId, { poll = 5_000, enabled = true } = {}) {
  const [data, setData] = useState({ state: 'loading', playback: null, metadata: null, volume: null });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    if (!enabled || !groupId) { setData({ state: 'idle', playback: null, metadata: null, volume: null }); return; }
    let alive = true;
    const run = async () => {
      try {
        const enc = encodeURIComponent(groupId);
        const [pb, md, vol] = await Promise.allSettled([
          getJson(`/api/sonos/control/groups/${enc}/playback`),
          getJson(`/api/sonos/control/groups/${enc}/playbackMetadata`),
          getJson(`/api/sonos/control/groups/${enc}/groupVolume`),
        ]);
        if (alive) setData({
          state: 'live',
          playback: pb.status === 'fulfilled' ? pb.value : null,
          metadata: md.status === 'fulfilled' ? md.value : null,
          volume:   vol.status === 'fulfilled' ? vol.value : null,
        });
      } catch {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [groupId, poll, tick, enabled]);
  return { ...data, refresh };
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

export const sonos = {
  play:    (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/play`),
  pause:   (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/pause`),
  next:    (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/skipToNextTrack`),
  prev:    (groupId)              => call('POST', `/groups/${encodeURIComponent(groupId)}/playback/skipToPreviousTrack`),
  setGroupVolume: (groupId, vol)  => call('POST', `/groups/${encodeURIComponent(groupId)}/groupVolume`, { volume: Math.max(0, Math.min(100, Math.round(vol))) }),
  setPlayerVolume: (playerId, vol) => call('POST', `/players/${encodeURIComponent(playerId)}/playerVolume`, { volume: Math.max(0, Math.min(100, Math.round(vol))) }),
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
