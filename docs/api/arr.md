# Sonarr / Radarr / Lidarr / Readarr — REST API v3

Base: `${VITE_<SVC>_URL}/api/v3` · Auth: `X-Api-Key: <key>` header **or** `?apikey=` query (proxy injects).

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useArr(svc)`. Proxy: `/api/{sonarr|radarr|lidarr|readarr}/*`.

`svc → libPath` mapping:
- `sonarr` → `series`
- `radarr` → `movie`
- `lidarr` → `artist`
- `readarr` → `author`

## Endpoints we use
| Path | Returns |
|------|---------|
| `/queue?pageSize=10&includeUnknownSeriesItems=true` | active downloads — `records[]` (title, status, timeleft, size, sizeleft, trackedDownloadStatus, errorMessage), `totalRecords` |
| `/calendar?start=&end=&unmonitored=true` | upcoming releases in window |
| `/system/status` | `version`, `branch`, `appName`, `osName`, `startTime`, `appData` |
| `/wanted/missing?pageSize=1` | `totalRecords` = number of monitored items missing |
| `/{libPath}` | full library (large; cache + paginate when possible) |

## Other endpoints
### Activity / state
| `/health` | health check warnings (indexer down, disk full, …) |
| `/queue/details` | per-track/episode breakdown of a queue record |
| `/queue/status` | aggregate counts |
| `/history?pageSize=20&sortKey=date&sortDir=desc` | grabbed/imported/failed events |
| `/wanted/cutoff` | items below cutoff quality |
| `/diskspace` | free space per root folder |
| `/system/task` | scheduled tasks state |
| `/log?pageSize=50` | recent log lines |
| `/update` | pending app updates |
| `/backup` | available backups |

### Library mutations / lookup
| `GET /{libPath}/lookup?term=` | TMDb/TVDb/MusicBrainz search proxy |
| `POST /{libPath}` | add new series/movie/etc. |
| `PUT /{libPath}/{id}` | edit (monitor flag, quality profile) |
| `DELETE /{libPath}/{id}?deleteFiles=true&addImportListExclusion=false` | remove |
| `POST /command` body `{name:"RefreshSeries", seriesId:N}` | trigger commands — `RescanSeries`, `MissingEpisodeSearch`, `RssSync`, `Backup`, `RefreshMonitoredDownloads`, `MovieSearch`, `ApplicationUpdate` |
| `GET /command/{id}` | command status |

### Configuration / profiles
| `/qualityprofile` | quality profiles |
| `/languageprofile` (Sonarr) | language profiles |
| `/customformat` | custom formats |
| `/rootfolder` | root folders + free space |
| `/indexer` | indexers + last sync state |
| `/downloadclient` | qBit/SABnzbd/etc. |
| `/notification` | notification connections (Discord, ntfy, …) |
| `/importlist` | trakt/tmdb lists |
| `/tag` | tags |

### Calendar / RSS
| `/calendar?start=ISO&end=ISO&unmonitored=true&includeSeries=true&includeEpisodeFile=true&includeEpisodeImages=true` | rich calendar with poster URLs and file presence |
| `/calendar/feed.ics?apikey=` | iCal feed |

## Sonarr-specific
- `/series/{id}` includes `seasons[]` with monitored flag.
- `/episode?seriesId=` — episode list.
- `/episodefile?seriesId=` — files on disk.

## Radarr-specific
- `/movie/{id}` includes `movieFile`, `collection`, `ratings`.
- `/extrafile/movie/{id}` — featurettes, trailers.

## Lidarr-specific
- `/album?artistId=`, `/track?albumId=`.

## Prowlarr-specific (`/api/v1`, not v3)

Prowlarr is a *meta*-indexer manager — it sits in front of all the *arr apps and centralizes indexer config. Different schema major (`v1`) and a different endpoint set. Base: `${VITE_PROWLARR_URL}/api/v1`.

| Path | Returns |
|------|---------|
| `GET /system/status` | version, build info |
| `GET /health` | health warnings (indexer down, captcha, missing API key) |
| `GET /indexer` | configured indexers — `id`, `name`, `protocol` (`torrent`/`usenet`), `privacy` (`public`/`semi-private`/`private`), `enable`, `priority`, `categories[]`, `capabilities`, `definitionName` |
| `GET /indexer/{id}` | full indexer config (cookies, API keys, base URL) |
| `GET /indexerstats` | per-indexer stats — `numberOfQueries`, `numberOfGrabs`, `averageResponseTime`, `numberOfFailedQueries`, `numberOfFailedGrabs`. Filter `?startDate=&endDate=&indexerIds=&hostStats=true` |
| `GET /indexer/schema` | available indexer definitions (templates) |
| `POST /indexer` body schema | add an indexer |
| `POST /indexer/test` body schema | test before saving |
| `POST /indexer/action/{id}/checkCaptcha` | re-solve captcha |
| `GET /search?query=&indexerIds=&type=search&categories=` | direct query — proxies to indexers; returns Newznab-shaped results merged across configured indexers |
| `GET /history?page=1&pageSize=20&sortKey=date&sortDirection=desc&eventType=1` | search/grab history. eventTypes: 1=indexerQuery, 2=indexerRss, 3=releaseGrabbed, 4=indexerAuth |
| `GET /applications` | downstream *arr apps Prowlarr is syncing to |
| `POST /applications/test` | test connectivity to a downstream app |
| `POST /applications/{id}/sync` | force re-sync indexers to that app |
| `GET /downloadclient` | download clients shared via Prowlarr |
| `GET /notification` | notification connections (Discord/etc.) |
| `GET /tag` | tags |
| `POST /command` body `{name, indexerIds?}` | commands: `RssSync`, `IndexerHealthCheck`, `ApplicationIndexerSync`, `Backup` |

**Prowlarr-specific pitfalls**:
- v1 path, not v3 — copying a Sonarr URL pattern will 404.
- `/indexer` reveals API keys/cookies in plain JSON. Don't log responses.
- `/search` is **synchronous** — slow indexers block the response. Pass `indexerIds=` to limit.
- Prowlarr's role is config sync; if you want "what was grabbed", look in the *target* app's `/api/v3/history`, not Prowlarr's. Prowlarr's history is search-side.
- The "indexerstats" health probe used to break on TorBT; if you see consistent `numberOfFailedQueries` for one indexer, check `/indexer/{id}/test` rather than just disabling.

Reference: <https://prowlarr.com/docs/api/>

## Pagination convention
`?page=1&pageSize=10&sortKey=timeleft&sortDir=asc&filterKey=status&filterValue=warning`. Response shape: `{page, pageSize, sortKey, sortDirection, totalRecords, records[]}`.

## Pitfalls
- All four apps share the schema but **`libPath` differs** — abstract carefully.
- v3 dropped `/api/` prefix — always include `v3`.
- `timeleft` is `HH:MM:SS` string. `size`/`sizeleft` are bytes (number).
- `system/status.appData` = absolute path inside container — useful for backup verification.
- Queue records may have `status: "warning"` with `errorMessage` populated — surface those.
- `unmonitored=true` on `/calendar` is needed to see items you're tracking but not auto-grabbing.
- Whisparr (XXX) uses the same v3 schema if you ever need it.

## Reference
- Sonarr: <https://sonarr.tv/docs/api/>
- Radarr: <https://radarr.video/docs/api/>
- Lidarr: <https://lidarr.audio/docs/api/>
- Readarr: <https://readarr.com/docs/api/>
