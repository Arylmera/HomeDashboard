import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

/* Spotify Web API (server-proxied at /api/spotify/v1/*).
 *
 * Auth flow: browser hits /api/spotify/oauth/login → Spotify → callback
 * persists tokens server-side. All API calls go through /api/spotify/v1/*
 * so the access token never reaches the browser. */

export function useSpotifyAuth({ poll = 60_000 } = {}) {
  const { data, state, refresh } = usePolling(
    (signal) => getJson('/api/spotify/oauth/status', { signal }),
    { poll, cacheKey: 'spotify-auth'}
  );
  return { state, configured: data?.configured ?? false, authenticated: data?.authenticated ?? false, refresh };
}

export function useSpotifyPlayback({ poll = 5_000, enabled = true } = {}) {
  const { data, state, refresh } = usePolling(
    enabled
      ? async (signal) => {
          const r = await fetch('/api/spotify/v1/me/player', {
            signal,
            headers: { Accept: 'application/json' },
          });
          // 204 No Content == nothing playing; that's a "live" state, not an error.
          if (r.status === 204) return null;
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }
      : null,
    { poll, deps: [enabled], cacheKey: 'spotify-playback'}
  );
  if (!enabled) return { state: 'idle', playback: null, refresh };
  return { state, playback: data ?? null, refresh };
}

export function useSpotifyPlaylists({ enabled = true, limit = 50 } = {}) {
  const { data, state } = usePolling(
    enabled
      ? async (signal) => {
          const j = await getJson(`/api/spotify/v1/me/playlists?limit=${limit}`, { signal });
          return j.items || [];
        }
      : null,
    { poll: 0, deps: [enabled, limit], cacheKey: 'spotify-playlists' }
  );
  if (!enabled) return { state: 'idle', playlists: [] };
  return { state, playlists: data || [] };
}

export function useSpotifyDevices({ poll = 15_000, enabled = true } = {}) {
  const { data, state, refresh } = usePolling(
    enabled
      ? async (signal) => {
          const j = await getJson('/api/spotify/v1/me/player/devices', { signal });
          return j.devices || [];
        }
      : null,
    { poll, deps: [enabled], cacheKey: 'spotify-devices'}
  );
  if (!enabled) return { state: 'idle', devices: [], refresh };
  return { state, devices: data || [], refresh };
}

async function call(method, path, body) {
  const r = await fetch(`/api/spotify/v1${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

const clampVol = (n) => Math.max(0, Math.min(100, Math.round(n)));
const deviceQs = (deviceId) => deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';

export const spotify = {
  play: ({ deviceId, contextUri, uris, positionMs } = {}) => {
    const body = {};
    if (contextUri) body.context_uri = contextUri;
    if (uris) body.uris = uris;
    if (positionMs != null) body.position_ms = positionMs;
    return call('PUT', `/me/player/play${deviceQs(deviceId)}`, Object.keys(body).length ? body : undefined);
  },
  pause:    ({ deviceId } = {}) => call('PUT',  `/me/player/pause${deviceQs(deviceId)}`),
  next:     ({ deviceId } = {}) => call('POST', `/me/player/next${deviceQs(deviceId)}`),
  previous: ({ deviceId } = {}) => call('POST', `/me/player/previous${deviceQs(deviceId)}`),
  seek: (positionMs, { deviceId } = {}) => {
    const params = new URLSearchParams({ position_ms: String(positionMs) });
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/seek?${params}`);
  },
  setVolume: (percent, { deviceId } = {}) => {
    const params = new URLSearchParams({ volume_percent: String(clampVol(percent)) });
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/volume?${params}`);
  },
  shuffle: (state, { deviceId } = {}) => {
    const params = new URLSearchParams({ state: state ? 'true' : 'false' });
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/shuffle?${params}`);
  },
  repeat: (state, { deviceId } = {}) => {
    // off | track | context — Spotify rejects everything else.
    const params = new URLSearchParams({ state });
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/repeat?${params}`);
  },
  transfer: (deviceId, { play = true } = {}) =>
    call('PUT', '/me/player', { device_ids: [deviceId], play }),
  search: (q, types = ['track', 'album', 'artist', 'playlist'], limit = 10) => {
    const params = new URLSearchParams({ q, type: types.join(','), limit: String(limit) });
    return call('GET', `/search?${params}`);
  },
  playlists: (limit = 50) => call('GET', `/me/playlists?limit=${limit}`),
};

export async function spotifyLogout() {
  const r = await fetch('/api/spotify/oauth/logout', { method: 'POST' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}
