# Audiobookshelf — REST API

Base: `${VITE_AUDIOBOOKSHELF_URL}/api` · Auth: `Authorization: Bearer <token>` (proxy injects). Token from Settings → Users → API token.

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useAudiobookshelf()`. Proxy: `/api/audiobookshelf/*`.

## Endpoints we use
| Path | Returns |
|------|---------|
| `/libraries` | `{libraries:[{id, name, mediaType:"book"|"podcast", folders[], stats:{...}, settings, lastUpdate}]}` |

## Other useful endpoints
### Libraries
| `GET /libraries/{id}` | library detail |
| `GET /libraries/{id}/items?limit=25&page=0&sort=addedAt&desc=1&filter=` | items in library |
| `GET /libraries/{id}/series?...` | series (book libraries) |
| `GET /libraries/{id}/collections` | collections |
| `GET /libraries/{id}/playlists` | playlists |
| `GET /libraries/{id}/personalized` | "for you" rows |
| `GET /libraries/{id}/stats` | duration totals, item counts, top authors/genres |
| `GET /libraries/{id}/recent-episodes` (podcast) | new episodes |
| `POST /libraries/{id}/scan` | trigger scan |

### Items / playback
| `GET /items/{id}` | full item — `media`, `libraryFiles`, `media.metadata`, `media.audioFiles[]`, `media.chapters[]`, `media.tracks[]` |
| `GET /items/{id}/cover?format=jpeg&width=400` | cover image |
| `POST /session` body `{libraryItemId, episodeId?, mediaPlayer}` | open playback session |
| `POST /session/{sessionId}/sync` body `{currentTime, timeListened, duration}` | progress update |
| `POST /session/{sessionId}/close` | end session |
| `GET /me/progress/{libraryItemId}` | current user progress |
| `PATCH /me/progress/{libraryItemId}` body `{currentTime, isFinished}` | manual progress |
| `GET /me/listening-stats?days=7` | listening stats |
| `GET /me/listening-sessions?itemsPerPage=10&page=0` | session history |

### Users / auth
| `POST /login` body `{username, password}` | session login (returns user + token) |
| `GET /me` | current user |
| `GET /users` (admin) | users |
| `POST /users` (admin) | create user |
| `PATCH /users/{id}` | edit |

### Search / discover
| `GET /libraries/{id}/search?q=&limit=20` | search a library |
| `GET /authors/{id}` / `/series/{id}` | author/series detail with items |

### Server
| `GET /ping` | health (unauth) |
| `GET /status` | server state |
| `GET /server/settings` (admin) | server config |
| `GET /server/tasks` | running scan/match tasks |
| `WS /` (Socket.IO) | live events: scan progress, session updates, item added |

### Podcasts
| `POST /podcasts` body `{path, mediaMetadata:{feedUrl, title, ...}, libraryId, folderId, autoDownloadEpisodes}` | add podcast |
| `POST /podcasts/{id}/check-new` | poll RSS |
| `POST /podcasts/{id}/download-episode` body `{episode}` | manual download |
| `GET /podcasts/feed?rssFeed=` | parse arbitrary feed (server-side) |

## Pitfalls
- "Books" and "Podcasts" libraries return slightly different schemas under `media`. Always branch on `mediaType`.
- Cover URLs require auth — use `?token=` query param (or rely on proxy to inject header) when embedding in `<img>`.
- `currentTime` is **seconds** (float).
- Token expiry: tokens issued via `/login` last forever unless rotated; API tokens from settings are the same shape.
- Pagination uses `page` (0-indexed) + `itemsPerPage` or `limit`. Inconsistent across endpoints — read each.
- Socket.IO is the canonical way to follow scans; polling `/server/tasks` works but is laggier.

## Reference
- API docs: <https://api.audiobookshelf.org/>
- Source: <https://github.com/advplyr/audiobookshelf>
