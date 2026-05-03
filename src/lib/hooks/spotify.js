import { useState, useEffect } from 'react';
import { getJson } from './_fetcher.js';

/* Spotify Web API (server-proxied at /api/spotify/v1/*).
 *
 * Auth flow: browser hits /api/spotify/oauth/login → Spotify → callback
 * persists tokens server-side. All API calls go through /api/spotify/v1/...
 * so the access token never reaches the browser. */

export function useSpotifyAuth({ poll = 60_000 } = {}) {
  const [data, setData] = useState({ state: 'loading', configured: false, authenticated: false });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson('/api/spotify/oauth/status');
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

export function useSpotifyPlayback({ poll = 5_000, enabled = true } = {}) {
  const [data, setData] = useState({ state: 'loading', playback: null });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    if (!enabled) { setData({ state: 'idle', playback: null }); return; }
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch('/api/spotify/v1/me/player', { headers: { Accept: 'application/json' } });
        if (r.status === 204) { if (alive) setData({ state: 'live', playback: null }); return; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (alive) setData({ state: 'live', playback: j });
      } catch (e) {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, tick, enabled]);
  return { ...data, refresh };
}

export function useSpotifyPlaylists({ enabled = true, limit = 50 } = {}) {
  const [data, setData] = useState({ state: 'loading', playlists: [] });
  useEffect(() => {
    if (!enabled) { setData({ state: 'idle', playlists: [] }); return; }
    let alive = true;
    (async () => {
      try {
        const j = await getJson(`/api/spotify/v1/me/playlists?limit=${limit}`);
        if (alive) setData({ state: 'live', playlists: j.items || [] });
      } catch {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    })();
    return () => { alive = false; };
  }, [enabled, limit]);
  return data;
}

export function useSpotifyDevices({ poll = 15_000, enabled = true } = {}) {
  const [data, setData] = useState({ state: 'loading', devices: [] });
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    if (!enabled) { setData({ state: 'idle', devices: [] }); return; }
    let alive = true;
    const run = async () => {
      try {
        const j = await getJson('/api/spotify/v1/me/player/devices');
        if (alive) setData({ state: 'live', devices: j.devices || [] });
      } catch {
        if (alive) setData(d => ({ ...d, state: 'error' }));
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll, tick, enabled]);
  return { ...data, refresh };
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

export const spotify = {
  play:        ({ deviceId, contextUri, uris, positionMs } = {}) => {
    const q = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const body = {};
    if (contextUri) body.context_uri = contextUri;
    if (uris) body.uris = uris;
    if (positionMs != null) body.position_ms = positionMs;
    return call('PUT', `/me/player/play${q}`, Object.keys(body).length ? body : undefined);
  },
  pause:       ({ deviceId } = {}) => call('PUT', `/me/player/pause${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''}`),
  next:        ({ deviceId } = {}) => call('POST', `/me/player/next${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''}`),
  previous:    ({ deviceId } = {}) => call('POST', `/me/player/previous${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''}`),
  seek:        (positionMs, { deviceId } = {}) => {
    const params = new URLSearchParams({ position_ms: String(positionMs) });
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/seek?${params}`);
  },
  setVolume:   (percent, { deviceId } = {}) => {
    const params = new URLSearchParams({ volume_percent: String(Math.max(0, Math.min(100, Math.round(percent)))) });
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/volume?${params}`);
  },
  shuffle:     (state, { deviceId } = {}) => {
    const params = new URLSearchParams({ state: state ? 'true' : 'false' });
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/shuffle?${params}`);
  },
  repeat:      (state, { deviceId } = {}) => {
    const params = new URLSearchParams({ state }); // off | track | context
    if (deviceId) params.set('device_id', deviceId);
    return call('PUT', `/me/player/repeat?${params}`);
  },
  transfer:    (deviceId, { play = true } = {}) => call('PUT', '/me/player', { device_ids: [deviceId], play }),
  search:      (q, types = ['track', 'album', 'artist', 'playlist'], limit = 10) => {
    const params = new URLSearchParams({ q, type: types.join(','), limit: String(limit) });
    return call('GET', `/search?${params}`);
  },
  playlists:   (limit = 50) => call('GET', `/me/playlists?limit=${limit}`),
};

export async function spotifyLogout() {
  const r = await fetch('/api/spotify/oauth/logout', { method: 'POST' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}
