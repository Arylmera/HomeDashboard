/* ============================================================== *
 *  Sonos LAN control — replaces the cloud OAuth integration with
 *  direct UPnP/SOAP on port 1400. No tokens, no cloud, no portal.
 *
 *  Discovers players via SSDP (or static SONOS_HOSTS=ip1,ip2,...)
 *  and exposes the same /api/sonos/control/* shape the cloud version
 *  used so the React side doesn't change.
 *
 *  Endpoints:
 *    GET  /api/sonos/oauth/status     → { configured, authenticated }
 *    POST /api/sonos/oauth/logout     → no-op (forces rediscovery)
 *    GET  /api/sonos/control/households                        → [{id,name}]
 *    GET  /api/sonos/control/households/:hid/groups            → {groups,players}
 *    GET  /api/sonos/control/groups/:gid/playback              → playback state
 *    GET  /api/sonos/control/groups/:gid/playbackMetadata      → track info
 *    GET  /api/sonos/control/groups/:gid/groupVolume           → {volume,muted}
 *    POST /api/sonos/control/groups/:gid/groupVolume           → {volume}
 *    POST /api/sonos/control/groups/:gid/playback/play         → resume
 *    POST /api/sonos/control/groups/:gid/playback/pause        → pause
 *    POST /api/sonos/control/groups/:gid/playback/skipToNextTrack
 *    POST /api/sonos/control/groups/:gid/playback/skipToPreviousTrack
 *    POST /api/sonos/control/players/:pid/playerVolume         → {volume}
 *    POST /api/sonos/control/households/:hid/groups/:gid/groups/modifyGroupMembers
 *    GET  /api/sonos/control/households/:hid/favorites
 *    POST /api/sonos/control/groups/:gid/favorites             → {favoriteId}
 * ============================================================== */
import sonosLib from 'sonos';
const { Sonos, AsyncDeviceDiscovery } = sonosLib;

const HOUSEHOLD_ID = 'lan';
const HOUSEHOLD_NAME = 'Local network';
const DISCOVERY_TTL = 30 * 1000;

let discoveryCache = null;     // { at, devices: Map<host,Sonos>, byUuid: Map<uuid,Sonos>, players, coordinators, groups }
let inFlight = null;

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function discoverFromHosts(hosts) {
  const devices = [];
  for (const host of hosts) {
    const d = new Sonos(host.trim());
    devices.push(d);
  }
  return devices;
}

async function discoverViaSSDP() {
  const disc = new AsyncDeviceDiscovery();
  // Wait up to 5s for any device, then collect all peers via getAllGroups
  const first = await disc.discover({ timeout: 5000 }).catch(() => null);
  if (!first) return [];
  const groups = await first.getAllGroups().catch(() => []);
  const hosts = new Set();
  for (const g of groups) {
    for (const m of g.ZoneGroupMember || []) {
      try { hosts.add(new URL(m.Location).hostname); } catch {}
    }
  }
  if (hosts.size === 0) return [first];
  return [...hosts].map(h => new Sonos(h));
}

async function buildSnapshot(devices) {
  if (devices.length === 0) return { players: [], coordinators: [], groups: [] };

  // Use first device to query the global topology — every Sonos returns the same view.
  const groupsRaw = await devices[0].getAllGroups().catch(() => []);

  const players = [];
  const groups = [];
  const byUuid = new Map();

  // Build a host → device map for quick lookup
  const devByHost = new Map();
  for (const d of devices) devByHost.set(d.host, d);

  for (const g of groupsRaw) {
    const memberIds = [];
    let coordinatorId = null;
    for (const m of g.ZoneGroupMember || []) {
      const uuid = m.UUID;
      const host = (() => { try { return new URL(m.Location).hostname; } catch { return null; } })();
      const player = {
        id: uuid,
        name: m.ZoneName,
        host,
        softwareVersion: m.SoftwareVersion || null,
      };
      players.push(player);
      memberIds.push(uuid);
      if (g.Coordinator === uuid || m.UUID === g.host) coordinatorId = uuid;
      if (host && devByHost.has(host)) byUuid.set(uuid, devByHost.get(host));
    }
    if (!coordinatorId) coordinatorId = g.Coordinator;
    // Sonos appends " + N" to group names when there are multiple
    // players. The dashboard shows the player pills already, so strip it.
    const rawName = g.Name || players.find(p => p.id === coordinatorId)?.name || 'Group';
    const name = rawName.replace(/\s*\+\s*\d+\s*$/, '');
    groups.push({
      id: g.ID,
      name,
      coordinatorId,
      playerIds: memberIds,
    });
  }

  // Playback state is intentionally NOT cached — fetched fresh on each
  // /groups GET so the room badges reflect reality within the page poll
  // interval (10s) rather than the discovery cache TTL (30s).
  return { players, coordinators: groups.map(g => g.coordinatorId), groups, byUuid };
}

async function getCache() {
  if (discoveryCache && Date.now() - discoveryCache.at < DISCOVERY_TTL) return discoveryCache;
  if (inFlight) return inFlight;
  // Wrap in a promise that ALWAYS clears `inFlight` — the previous
  // try/finally only ran when the IIFE itself threw synchronously, so
  // a rejected discoverViaSSDP() left `inFlight` permanently set,
  // wedging every subsequent /api/sonos/* call until the process
  // restarted.
  const p = (async () => {
    const staticHosts = (process.env.SONOS_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
    const devices = staticHosts.length > 0
      ? await discoverFromHosts(staticHosts)
      : await discoverViaSSDP();
    const snap = await buildSnapshot(devices);
    discoveryCache = { at: Date.now(), devices, ...snap };
    return discoveryCache;
  })();
  inFlight = p;
  p.finally(() => { if (inFlight === p) inFlight = null; });
  return p;
}

function invalidateCache() { discoveryCache = null; }

function deviceForGroup(cache, groupId) {
  const g = cache.groups.find(x => x.id === groupId);
  if (!g) return { error: 'group_not_found' };
  const dev = cache.byUuid.get(g.coordinatorId);
  if (!dev) return { error: 'coordinator_unreachable' };
  return { dev, group: g };
}

function deviceForPlayer(cache, playerId) {
  const dev = cache.byUuid.get(playerId);
  if (!dev) return { error: 'player_unreachable' };
  return { dev };
}

async function getGroupVolume(cache, group) {
  const dev = cache.byUuid.get(group.coordinatorId);
  if (!dev) return { volume: 0, muted: false };
  try {
    const vols = await Promise.all(group.playerIds.map(pid => {
      const d = cache.byUuid.get(pid);
      return d ? d.getVolume().catch(() => null) : Promise.resolve(null);
    }));
    const valid = vols.filter(v => v != null);
    if (valid.length === 0) return { volume: 0, muted: false };
    return { volume: Math.round(valid.reduce((a, b) => a + b, 0) / valid.length), muted: false };
  } catch { return { volume: 0, muted: false }; }
}

async function setGroupVolume(cache, group, vol) {
  const v = Math.max(0, Math.min(100, Math.round(vol)));
  await Promise.all(group.playerIds.map(pid => {
    const d = cache.byUuid.get(pid);
    return d ? d.setVolume(v).catch(() => null) : null;
  }));
}

export function sonosLanMiddleware() {
  return async (req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/api/sonos/') && url !== '/api/sonos') return next();

    // ─── Auth-shape compatibility ─────────────────────────────
    if (url.startsWith('/api/sonos/oauth/login')) {
      // No login required on LAN — bounce back to /music.html.
      res.statusCode = 302;
      res.setHeader('Location', '/music.html');
      res.end();
      return;
    }
    if (url.startsWith('/api/sonos/oauth/status')) {
      try {
        const cache = await getCache();
        return send(res, 200, { configured: true, authenticated: cache.players.length > 0 });
      } catch (e) {
        return send(res, 200, { configured: true, authenticated: false, error: String(e?.message || e) });
      }
    }
    if (url.startsWith('/api/sonos/oauth/logout')) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return send(res, 405, { error: 'POST only' });
      }
      invalidateCache();
      return send(res, 200, { ok: true });
    }

    // ─── Control routes ───────────────────────────────────────
    if (!url.startsWith('/api/sonos/control/')) {
      return send(res, 404, { error: 'unknown sonos route' });
    }
    const path = url.replace(/^\/api\/sonos\/control/, '').split('?')[0];

    let cache;
    try { cache = await getCache(); }
    catch (e) { return send(res, 502, { error: 'discovery_failed', detail: String(e?.message || e) }); }

    // GET /households
    if (path === '/households' && req.method === 'GET') {
      return send(res, 200, { households: [{ id: HOUSEHOLD_ID, name: HOUSEHOLD_NAME }] });
    }

    // GET /households/:hid/groups
    {
      const m = path.match(/^\/households\/([^/]+)\/groups$/);
      if (m && req.method === 'GET') {
        // Fetch playback state per group in parallel (fresh, not cached).
        const states = await Promise.all(cache.groups.map(async g => {
          const dev = cache.byUuid.get(g.coordinatorId);
          if (!dev) return 'PLAYBACK_STATE_IDLE';
          try {
            const s = await dev.getCurrentState();
            return s === 'playing'         ? 'PLAYBACK_STATE_PLAYING'
                 : s === 'paused_playback' ? 'PLAYBACK_STATE_PAUSED'
                 : s === 'transitioning'   ? 'PLAYBACK_STATE_PLAYING'
                 : 'PLAYBACK_STATE_IDLE';
          } catch { return 'PLAYBACK_STATE_IDLE'; }
        }));
        return send(res, 200, {
          groups: cache.groups.map((g, i) => ({
            id: g.id, name: g.name, playerIds: g.playerIds,
            coordinatorId: g.coordinatorId, playbackState: states[i],
          })),
          players: cache.players.map(p => ({ id: p.id, name: p.name })),
        });
      }
    }

    // GET /groups/:gid/playback
    {
      const m = path.match(/^\/groups\/([^/]+)\/playback$/);
      if (m && req.method === 'GET') {
        const gid = decodeURIComponent(m[1]);
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        try {
          const [state, pos] = await Promise.all([
            r.dev.getCurrentState().catch(() => 'unknown'),
            r.dev.avTransportService().GetPositionInfo().catch(() => null),
          ]);
          return send(res, 200, {
            playbackState:
              state === 'playing' ? 'PLAYBACK_STATE_PLAYING'
            : state === 'paused_playback' ? 'PLAYBACK_STATE_PAUSED'
            : 'PLAYBACK_STATE_IDLE',
            positionMs: pos?.RelTime ? hmsToMs(pos.RelTime) : 0,
            durationMs: pos?.TrackDuration ? hmsToMs(pos.TrackDuration) : 0,
          });
        } catch (e) { return send(res, 502, { error: 'playback_query_failed', detail: String(e?.message || e) }); }
      }
    }

    // GET /groups/:gid/playbackMetadata
    {
      const m = path.match(/^\/groups\/([^/]+)\/playbackMetadata$/);
      if (m && req.method === 'GET') {
        const gid = decodeURIComponent(m[1]);
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        try {
          const t = await r.dev.currentTrack().catch(() => null);
          if (!t) return send(res, 200, { currentItem: null });
          // Album art on Sonos is often a relative path served by the
          // speaker itself (`/getaa?...`). Resolve to an absolute URL.
          let imageUrl = t.albumArtURI || t.albumArtURL || null;
          if (imageUrl && !/^https?:/.test(imageUrl)) {
            imageUrl = `http://${r.dev.host}:1400${imageUrl}`;
          }
          return send(res, 200, {
            currentItem: {
              track: {
                name: t.title || null,
                artist: { name: t.artist || null },
                album:  { name: t.album  || null },
                imageUrl,
                durationMs: (t.duration || 0) * 1000,
              },
            },
            container: t.queuePosition != null ? { position: t.queuePosition } : null,
          });
        } catch (e) { return send(res, 502, { error: 'metadata_query_failed', detail: String(e?.message || e) }); }
      }
    }

    // GET /groups/:gid/groupVolume
    {
      const m = path.match(/^\/groups\/([^/]+)\/groupVolume$/);
      if (m && req.method === 'GET') {
        const gid = decodeURIComponent(m[1]);
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        const v = await getGroupVolume(cache, r.group);
        return send(res, 200, v);
      }
      if (m && req.method === 'POST') {
        const gid = decodeURIComponent(m[1]);
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        let body; try { body = await readBody(req); } catch { return send(res, 400, { error: 'invalid_json' }); }
        if (typeof body.volume !== 'number') return send(res, 400, { error: 'missing_volume' });
        await setGroupVolume(cache, r.group, body.volume);
        return send(res, 200, { ok: true });
      }
    }

    // POST /groups/:gid/playback/{play|pause|skipToNextTrack|skipToPreviousTrack}
    {
      const m = path.match(/^\/groups\/([^/]+)\/playback\/(play|pause|skipToNextTrack|skipToPreviousTrack)$/);
      if (m && req.method === 'POST') {
        const gid = decodeURIComponent(m[1]);
        const action = m[2];
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        try {
          if (action === 'play')                       await r.dev.play();
          else if (action === 'pause')                 await r.dev.pause();
          else if (action === 'skipToNextTrack')       await r.dev.next();
          else if (action === 'skipToPreviousTrack')   await r.dev.previous();
          return send(res, 200, { ok: true });
        } catch (e) { return send(res, 502, { error: 'transport_failed', detail: String(e?.message || e) }); }
      }
    }

    // POST /players/:pid/playerVolume
    {
      const m = path.match(/^\/players\/([^/]+)\/playerVolume$/);
      if (m && req.method === 'POST') {
        const pid = decodeURIComponent(m[1]);
        const r = deviceForPlayer(cache, pid);
        if (r.error) return send(res, 404, { error: r.error });
        let body; try { body = await readBody(req); } catch { return send(res, 400, { error: 'invalid_json' }); }
        if (typeof body.volume !== 'number') return send(res, 400, { error: 'missing_volume' });
        try { await r.dev.setVolume(Math.max(0, Math.min(100, Math.round(body.volume)))); return send(res, 200, { ok: true }); }
        catch (e) { return send(res, 502, { error: 'volume_failed', detail: String(e?.message || e) }); }
      }
    }

    // POST /households/:hid/groups/:gid/groups/modifyGroupMembers
    {
      const m = path.match(/^\/households\/([^/]+)\/groups\/([^/]+)\/groups\/modifyGroupMembers$/);
      if (m && req.method === 'POST') {
        const gid = decodeURIComponent(m[2]);
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        let body; try { body = await readBody(req); } catch { return send(res, 400, { error: 'invalid_json' }); }
        const add = body.playerIdsToAdd || [];
        const remove = body.playerIdsToRemove || [];
        try {
          // Add members: tell each new player to join the coordinator's group
          for (const pid of add) {
            const d = cache.byUuid.get(pid);
            if (!d) continue;
            const coord = cache.players.find(p => p.id === r.group.coordinatorId);
            if (coord) await d.joinGroup(coord.name).catch(() => null);
          }
          // Remove members: leave their group (ungroups them)
          for (const pid of remove) {
            const d = cache.byUuid.get(pid);
            if (!d) continue;
            await d.leaveGroup().catch(() => null);
          }
          invalidateCache();
          return send(res, 200, { ok: true });
        } catch (e) { return send(res, 502, { error: 'group_modify_failed', detail: String(e?.message || e) }); }
      }
    }

    // GET /households/:hid/favorites
    {
      const m = path.match(/^\/households\/([^/]+)\/favorites$/);
      if (m && req.method === 'GET') {
        const dev = cache.devices[0];
        if (!dev) return send(res, 200, { items: [] });
        try {
          const list = await dev.getFavorites().catch(() => ({ items: [] }));
          return send(res, 200, {
            items: (list.items || []).map((f, i) => ({
              id: f.uri || `${i}`,
              name: f.title,
              service: { name: f.itemType || 'sonos' },
              imageUrl: f.albumArtURI || null,
            })),
          });
        } catch (e) { return send(res, 502, { error: 'favorites_failed', detail: String(e?.message || e) }); }
      }
    }

    // POST /groups/:gid/playSpotify  body: { spotifyUri }
    {
      const m = path.match(/^\/groups\/([^/]+)\/playSpotify$/);
      if (m && req.method === 'POST') {
        const gid = decodeURIComponent(m[1]);
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        let body; try { body = await readBody(req); } catch { return send(res, 400, { error: 'invalid_json' }); }
        if (!body.spotifyUri) return send(res, 400, { error: 'missing_spotifyUri' });
        try {
          const out = await playSpotifyOnSonos(r.dev, body.spotifyUri);
          return send(res, 200, { ok: true, ...out });
        } catch (e) {
          return send(res, 502, { error: 'spotify_play_failed', detail: String(e?.message || e) });
        }
      }
    }

    // POST /groups/:gid/favorites
    {
      const m = path.match(/^\/groups\/([^/]+)\/favorites$/);
      if (m && req.method === 'POST') {
        const gid = decodeURIComponent(m[1]);
        const r = deviceForGroup(cache, gid);
        if (r.error) return send(res, 404, { error: r.error });
        let body; try { body = await readBody(req); } catch { return send(res, 400, { error: 'invalid_json' }); }
        if (!body.favoriteId) return send(res, 400, { error: 'missing_favoriteId' });
        try {
          // body.favoriteId == favorite URI in our adapter
          await r.dev.playUri(body.favoriteId);
          return send(res, 200, { ok: true });
        } catch (e) { return send(res, 502, { error: 'favorite_play_failed', detail: String(e?.message || e) }); }
      }
    }

    return send(res, 404, { error: 'unknown sonos control route', path });
  };
}

/* ─── Spotify-on-Sonos (LAN bypass for restricted Web API) ──── *
 *  Spotify Web API refuses transport on Sonos ("Restricted device").
 *  We load Spotify URIs directly onto Sonos via UPnP using the
 *  `x-sonos-spotify:` / `x-rincon-cpcontainer:` URI scheme. Requires
 *  the user has linked Spotify in the Sonos app at least once.
 *
 *  References:
 *    - https://github.com/jishi/node-sonos-http-api
 *    - https://sonos.svrooij.io/music-services
 *  ───────────────────────────────────────────────────────────── */
const SPOTIFY_SID = '9';
const SPOTIFY_SERVICE_TOKEN = '2311';

export function spotifyUriToSonos(spotifyUri, sn) {
  const m = String(spotifyUri).match(/^spotify:(track|album|playlist|artist):(.+)$/);
  if (!m) throw new Error('invalid_spotify_uri');
  const [, kind] = m;
  const encoded = encodeURIComponent(spotifyUri);
  if (kind === 'track') {
    return {
      uri: `x-sonos-spotify:${encoded}?sid=${SPOTIFY_SID}&flags=8224&sn=${sn}`,
      didlId: `00032020${encoded}`,
      parentId: '00020000track:0',
      upnpClass: 'object.item.audioItem.musicTrack',
      isContainer: false,
    };
  }
  const code = kind === 'album' ? '1004206c'
             : kind === 'playlist' ? '1006206c'
             : '10052064';
  return {
    uri: `x-rincon-cpcontainer:${code}${encoded}?sid=${SPOTIFY_SID}&flags=8300&sn=${sn}`,
    didlId: `${code}${encoded}`,
    parentId: '00020000',
    upnpClass: kind === 'album' ? 'object.container.album.musicAlbum' : 'object.container.playlistContainer',
    isContainer: true,
  };
}

export function buildSpotifyDidl({ didlId, parentId, upnpClass }) {
  return '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">'
    + `<item id="${didlId}" parentID="${parentId}" restricted="true">`
    + '<dc:title></dc:title>'
    + `<upnp:class>${upnpClass}</upnp:class>`
    + `<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON${SPOTIFY_SERVICE_TOKEN}_X_#Svc${SPOTIFY_SERVICE_TOKEN}-0-Token</desc>`
    + '</item></DIDL-Lite>';
}

let cachedSn = null;
async function discoverSpotifySn(device) {
  if (process.env.SONOS_SPOTIFY_SN) return process.env.SONOS_SPOTIFY_SN;
  if (cachedSn) return cachedSn;
  try {
    const favs = await device.getFavorites();
    for (const item of (favs?.items || [])) {
      const blob = JSON.stringify(item);
      const m = blob.match(/sn=(\d+)/);
      if (m) { cachedSn = m[1]; return cachedSn; }
    }
  } catch {}
  return '1';
}

async function playSpotifyOnSonos(device, spotifyUri) {
  const sn = await discoverSpotifySn(device);
  const { uri, didlId, parentId, upnpClass, isContainer } = spotifyUriToSonos(spotifyUri, sn);
  const metadata = buildSpotifyDidl({ didlId, parentId, upnpClass });
  console.log('[sonos-spotify] playing on', device.host, { spotifyUri, sn, isContainer, uri: uri.slice(0, 100) + '…' });
  try {
    if (isContainer) {
      await device.flush().catch((e) => console.warn('[sonos-spotify] flush failed', e?.message));
      await device.queue({ uri, metadata });
      // Switch AVTransport source to the queue, then play track 1.
      // Without this Sonos's transport is still pointed at the prior
      // URI (often empty) and play() fails with UPnP 701.
      try { await device.selectQueue(); }
      catch (e) {
        // Fallback: setAVTransportURI directly to the queue endpoint.
        const queueUri = `x-rincon-queue:${(await device.getZoneAttrs?.().catch(() => ({})))?.CurrentZoneName || ''}#0`;
        console.warn('[sonos-spotify] selectQueue failed, fallback', e?.message);
      }
      try { await device.selectTrack(1); } catch {}
      await device.play();
    } else {
      await device.play({ uri, metadata });
    }
    return { uri, sn };
  } catch (e) {
    console.error('[sonos-spotify] playback failed', { spotifyUri, sn, isContainer, error: e?.message });
    throw e;
  }
}

export function hmsToMs(s) {
  const parts = String(s).split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
}

export function sonosLanPlugin() {
  return {
    name: 'sonos-lan',
    configureServer(s)        { s.middlewares.use(sonosLanMiddleware()); },
    configurePreviewServer(s) { s.middlewares.use(sonosLanMiddleware()); },
  };
}
