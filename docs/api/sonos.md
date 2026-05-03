# Sonos LAN control

Base (server-emulated): `/api/sonos/control/*`
Server module: [src/server/sonos-lan.js](../../src/server/sonos-lan.js)

## Why LAN, not cloud

Sonos's developer portal (`developer.sonos.com`) currently has a UI bug that hides the "New control integration" button for new accounts, blocking cloud OAuth credentials. Rather than wait on Sonos support, we talk directly to the speakers over UPnP/SOAP on port 1400.

Trade-offs:

| | LAN (current)                       | Cloud OAuth (previous) |
|----------|-------------------------------------|------------------------|
| Setup    | None — auto-discover via SSDP       | Register integration, OAuth flow |
| Internet | Not required                        | Required |
| Latency  | ~tens of ms                         | ~hundreds of ms |
| Auth     | None — same LAN = trusted           | OAuth2 + refresh tokens |
| Off-LAN  | ❌                                   | ✅ |

For a home dashboard running on the same network as the speakers, LAN is strictly better.

## Discovery

By default, the server uses SSDP (multicast) on startup and refreshes the topology every 30 s. The first responding device is queried for `getAllGroups()` and every member is added.

If your network blocks multicast (some VLANs, some Docker bridge nets), set:

```
SONOS_HOSTS=192.168.1.42,192.168.1.43
```

— a comma-separated list of speaker IPs. Discovery is skipped; the listed hosts are used directly.

## Endpoints emulated

The middleware preserves the cloud Control API URL shape so the React side wasn't touched.

| Path                                                        | Method | Purpose |
|-------------------------------------------------------------|--------|---------|
| `/oauth/status`                                              | GET    | `{configured: true, authenticated: <speakers found>}` |
| `/oauth/login`                                               | GET    | 302 → `/music.html` (no-op, kept for compat) |
| `/oauth/logout`                                              | POST   | Force re-discovery |
| `/control/households`                                        | GET    | Synthetic single household `lan` |
| `/control/households/{hid}/groups`                           | GET    | Live groups + players |
| `/control/groups/{gid}/playback`                             | GET    | State + position + duration |
| `/control/groups/{gid}/playbackMetadata`                     | GET    | Current track |
| `/control/groups/{gid}/groupVolume`                          | GET/POST | Average / set across members |
| `/control/groups/{gid}/playback/{play|pause|skipToNextTrack|skipToPreviousTrack}` | POST | Transport (coordinator) |
| `/control/players/{pid}/playerVolume`                        | POST   | Per-speaker volume |
| `/control/households/{hid}/groups/{gid}/groups/modifyGroupMembers` | POST | `joinGroup` / `leaveGroup` |
| `/control/households/{hid}/favorites`                        | GET    | `device.getFavorites()` |
| `/control/groups/{gid}/favorites`                            | POST   | `device.playUri(favoriteId)` |

## Strategy: Spotify drives, Sonos coordinates

Sonos speakers register as Spotify Connect devices once you've played to them from the Spotify app at least once. The dashboard uses:

- **Sonos LAN** for room/group awareness, group membership, group volume.
- **Spotify Web API** for transport, search, queue — by transferring playback to the Sonos speaker's Spotify Connect device id (matched by speaker name).

## Pitfalls

- **Docker bridge networking** breaks SSDP. Use `--network=host` or set `SONOS_HOSTS` explicitly.
- **VPN on the host** can shadow the LAN interface and cause discovery to fail. Disable VPN or pin to the LAN interface.
- **`groupId` rotates** when group membership changes. The page polls every 10 s and re-resolves.
- **Group volume** is computed as the mean of member volumes — Sonos has a real `GroupRenderingControl` SOAP service for this but the `sonos` npm package doesn't wrap it cleanly; mean is close enough for a slider.
- **Spotify Connect mapping** is by speaker name (case-insensitive). Rename mismatches break transfer — keep Sonos and Spotify names aligned.
- **Favorites** returned by the LAN API are tied to Sonos's local cache, not the cloud favorites list. Refresh the Sonos app if a new favorite doesn't show up.

## Reference

- `sonos` npm package: <https://github.com/bencevans/node-sonos>
- UPnP control protocol (Sonos uses standard UPnP/AV): <https://upnp.org/specs/av/>
