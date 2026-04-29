# Plex Media Server — HTTP API

Base: `${VITE_PLEX_URL}` (e.g. `http://nas:32400`). Auth header: `X-Plex-Token: <token>` (proxy injects). Most endpoints accept `Accept: application/json` (default is XML).

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `usePlex()`. Proxy: `/api/plex/*`.

## Endpoints we use
| Path | Returns |
|------|---------|
| `/status/sessions` | currently-playing — `MediaContainer.size`, `Metadata[]` (title, grandparentTitle, User, Player, Session, viewOffset, duration, TranscodeSession) |
| `/library/sections` | libraries — `Directory[]` (key, title, type, agent, scanner, language, refreshing, updatedAt) |
| `/library/sections/{key}/all?X-Plex-Container-Size=0&X-Plex-Container-Start=0` | item count — read `MediaContainer.totalSize`. `Size=0` returns header only |

## Useful additional endpoints
| Path | Returns |
|------|---------|
| `/` | server identity — `friendlyName`, `version`, `platform`, `machineIdentifier` |
| `/library/sections/{key}/recentlyAdded` | recent items per library |
| `/library/onDeck` | "on deck" rows for the user |
| `/library/sections/{key}/all?type=4&unwatched=1` | filter — type: 1=movie, 2=show, 3=season, 4=episode, 8=artist, 9=album, 10=track |
| `/library/sections/{key}/search?type=&query=` | server-side search |
| `/playlists` / `/playlists/{id}/items` | playlists |
| `/devices.xml` (XML only) | registered devices |
| `/clients` | connected players (cast targets) |
| `/transcode/sessions` | active transcodes — bitrate, target, throttled |
| `/statistics/bandwidth?timespan=6` | recent bandwidth (Tautulli does this better) |
| `/statistics/media?timespan=6` | per-user playtime |
| `/butler` | scheduled tasks state |
| `/updater/status` | server update available |
| `/myplex/account` | linked Plex account |
| `/library/sections/{key}/refresh` | trigger scan (POST/GET) |
| `/library/metadata/{ratingKey}` | full item detail (Media, Part, Stream — codec, bitrate, resolution) |
| `/library/metadata/{ratingKey}/children` | seasons → episodes drilldown |
| `/photo/:/transcode?width=&height=&url=` | thumbnail proxy (server returns optimized image) |

## Pagination / filtering
- `X-Plex-Container-Start` + `X-Plex-Container-Size` headers OR query params.
- `?sort=addedAt:desc`, `?sort=titleSort:asc,year:desc`.
- Filter examples: `?genre=18`, `?year=2024`, `?contentRating=PG-13`, `?unwatched=1`, `?inProgress=1`.
- `?includeGuids=1` to attach IMDb/TMDb/TVDB IDs to results.

## Auth
- **Get a token**: log into web UI, view any item, "Get Info → View XML" → URL has `X-Plex-Token=...`. Or via `https://plex.tv/users/sign_in.xml` Basic auth.
- Tokens scoped to user (admin token sees everything, managed-user tokens only see their library access).
- Tokens never expire unless rotated. Treat as secret.

## Pitfalls
- JSON requires `Accept: application/json` header; otherwise XML.
- `MediaContainer.size` is the current page; `totalSize` is the full count (only present when paginating).
- `viewOffset` and `duration` are in **milliseconds**.
- Sessions endpoint omits paused-but-recently-active streams; Tautulli is better for "active streams" accuracy.
- `ratingKey` is the canonical ID; `key` is a path. Don't confuse.
- Some endpoints (notably `/library/sections/{key}/all` with large libs) are slow — always paginate, don't fetch all items.

## Reference
- Unofficial: <https://www.plexopedia.com/plex-media-server/api/>
- Postman collection: search "Plex Media Server" on plex.tv forums
