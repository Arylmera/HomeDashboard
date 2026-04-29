# Overseerr / Jellyseerr — REST API v1

Base: `${VITE_SEERR_URL}/api/v1` · Auth: `X-Api-Key: <key>` header (proxy injects).

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useSeerr()`. Proxy: `/api/seerr/*`.

Jellyseerr is a fork — same paths, same shapes, mostly compatible.

## Endpoints we use
| Path | Returns |
|------|---------|
| `/request/count` | `{total, movie, tv, pending, approved, declined, processing, available}` |

## Other useful endpoints
### Requests
| `GET /request?take=20&skip=0&filter=pending&sort=added` | requests page — `pageInfo`, `results[]` (with `media`, `requestedBy`, `status`) |
| `GET /request/{id}` | single request |
| `POST /request` body `{mediaType:"movie"\|"tv", mediaId, seasons?:[]}` | create request |
| `POST /request/{id}/approve` / `/decline` / `/retry` / `/available` | mutate state |
| `DELETE /request/{id}` | remove |

### Discovery / search
| `GET /search?query=&page=1` | TMDb-backed multi-search |
| `GET /movie/{tmdbId}` / `/tv/{tmdbId}` | full media detail (Plex/Sonarr availability merged) |
| `GET /discover/movies?genre=&page=` | discovery rows |
| `GET /discover/trending` | trending |
| `GET /movie/{id}/recommendations` / `/similar` | recs |
| `GET /collection/{id}` | movie collection |

### Users / auth
| `GET /user` | configured users |
| `GET /user/{id}` | user detail |
| `GET /user/{id}/quota` | per-user request quota |
| `GET /user/{id}/watchlist` | Plex Watchlist proxy |
| `POST /auth/local` body `{email,password}` | login (cookie session) |
| `POST /auth/plex` body `{authToken}` | Plex SSO |
| `GET /auth/me` | current session user |

### System / status
| `GET /status` | `version`, `commitTag`, `updateAvailable`, `commitsBehind` |
| `GET /status/appdata` | appdata path (verify backups) |
| `GET /settings/about` | system info |
| `GET /service/sonarr` / `/radarr` | configured *arr instances |
| `GET /service/sonarr/{id}` | sonarr indexer detail (root folders, profiles) |
| `GET /issue?take=20&filter=open` | reported issues from users |

### Notifications
| `GET /settings/notifications/{type}` | per-channel config (`discord`, `slack`, `pushover`, `email`, `webhook`, `gotify`, `telegram`, `pushbullet`, `lunasea`, `webpush`) |
| `POST /settings/notifications/{type}/test` | fire test notification |

## Pitfalls
- `request.status` codes: 1=pending, 2=approved, 3=declined. `media.status`: 1=unknown, 2=pending, 3=processing, 4=partially available, 5=available.
- `mediaId` for requests is **TMDb ID** (or TVDb for some Jellyseerr setups), not internal DB id.
- TV requests need `seasons` array; pass `[]` for "all seasons".
- Response shape for paginated endpoints: `{pageInfo:{pages,pageSize,results,page}, results:[...]}`.
- Rate-limited if hit hard — TMDb backend has its own quotas surfaced as 429.
- Jellyseerr replaces Plex SSO with Jellyfin auth on `/auth/jellyfin`.

## Reference
- Spec: <https://api-docs.overseerr.dev/>
- Source: <https://github.com/sct/overseerr>
- Jellyseerr: <https://github.com/Fallenbagel/jellyseerr>
