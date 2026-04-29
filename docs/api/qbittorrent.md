# qBittorrent — Web API v2

Base: `${VITE_QBITTORRENT_URL}/api/v2` · Auth: cookie session via `/api/v2/auth/login`. Form-encoded body, **not** JSON.

Used in: not yet wired. Proxy: `/api/qbittorrent/*` → upstream.

## Auth flow

```
POST /api/qbittorrent/api/v2/auth/login
Content-Type: application/x-www-form-urlencoded
Body: username=<USER>&password=<PASS>

→ 200 "Ok."
   Set-Cookie: SID=<sessionId>; HttpOnly
```

Subsequent calls send the `SID` cookie automatically (browser handles it; `fetch` needs `credentials: "include"`). Session lifetime configurable in qBit settings (default 1h).

```
GET /api/qbittorrent/api/v2/auth/logout    # ends session
```

If the WebUI has "Bypass authentication for clients on localhost" enabled, the proxy gets free access (it's localhost from qBit's perspective). Otherwise the **dev server** must keep the cookie. Easiest: do login client-side once and let the browser cookie pin to the dashboard origin.

## Useful endpoints

### App
| Path | Returns |
|------|---------|
| `GET /app/version` | `"v4.6.5"` (text) |
| `GET /app/webapiVersion` | `"2.10"` (text) |
| `GET /app/buildInfo` | `{qt, libtorrent, boost, openssl, bitness}` |
| `GET /app/preferences` | full settings dict (huge) |
| `POST /app/setPreferences` body form `json={...}` | mutate settings |
| `GET /app/defaultSavePath` | default download folder |

### Torrents
| Path | Returns |
|------|---------|
| `GET /torrents/info?filter=&category=&tag=&sort=&reverse=&limit=&offset=` | torrents list — `hash`, `name`, `state`, `progress`, `dlspeed`, `upspeed`, `size`, `total_size`, `eta`, `ratio`, `added_on`, `completion_on`, `category`, `tags`, `tracker`, `save_path`, `num_seeds`, `num_leechs`, `priority`, `availability`, `time_active`, `seen_complete`. Filters: `all`, `downloading`, `seeding`, `completed`, `paused`, `active`, `inactive`, `resumed`, `stalled`, `stalled_uploading`, `stalled_downloading`, `errored` |
| `GET /torrents/properties?hash=` | per-torrent details (peers/seeds breakdown, ratio limits, save path, addition_date, comment) |
| `GET /torrents/trackers?hash=` | trackers + status + msg |
| `GET /torrents/webseeds?hash=` | web seeds |
| `GET /torrents/files?hash=` | file list — `index`, `name`, `size`, `progress`, `priority`, `is_seed`, `availability` |
| `GET /torrents/pieceStates?hash=` / `/pieceHashes?hash=` | piece-level state |
| `POST /torrents/add` body multipart (`urls=`, `torrents=` files, `savepath=`, `category=`, `tags=`, `paused=`) | add by URL/magnet/file |
| `POST /torrents/delete` body `hashes=&deleteFiles=true|false` | remove |
| `POST /torrents/pause` / `/resume` body `hashes=` | toggle |
| `POST /torrents/recheck` / `/reannounce` | force action |
| `POST /torrents/setLocation` body `hashes=&location=` | move files |
| `POST /torrents/rename` body `hash=&name=` | rename torrent |
| `POST /torrents/setCategory` body `hashes=&category=` | recategorize |
| `POST /torrents/createCategory` body `category=&savePath=` | new category |
| `POST /torrents/addTags` / `/removeTags` body `hashes=&tags=t1,t2` | tags |
| `POST /torrents/setShareLimits` body `hashes=&ratioLimit=&seedingTimeLimit=` | per-torrent limits |
| `POST /torrents/setForceStart` body `hashes=&value=true` | force start past queue |
| `POST /torrents/topPrio` / `/bottomPrio` / `/increasePrio` / `/decreasePrio` | queue ordering |
| `POST /torrents/filePrio` body `hash=&id=&priority=0|1|6|7` | per-file prio (0=skip, 1=normal, 6=high, 7=max) |

### Transfer / global
| `GET /transfer/info` | global stats — `dl_info_speed`, `dl_info_data`, `up_info_speed`, `up_info_data`, `dl_rate_limit`, `up_rate_limit`, `connection_status` (`connected`/`firewalled`/`disconnected`) |
| `GET /transfer/speedLimitsMode` | `0` = normal, `1` = alternative |
| `POST /transfer/toggleSpeedLimitsMode` | flip global speed mode |
| `GET /transfer/downloadLimit` / `/uploadLimit` | global rate limits (bytes/s) |
| `POST /transfer/setDownloadLimit` body `limit=` | set |
| `POST /transfer/banPeers` body `peers=ip:port|ip:port` | ban |

### Sync (long-poll deltas — efficient for live UI)
| `GET /sync/maindata?rid={lastRid}` | full state on first call (`rid:0`), then deltas. Use as primary feed in dashboards |
| `GET /sync/torrentPeers?hash=&rid=` | peer-level deltas |

### RSS
| `GET /rss/items?withData=true` | RSS folders + items |
| `POST /rss/addFeed` body `url=&path=` | add feed |
| `POST /rss/setRule` body `ruleName=&ruleDef={json}` | auto-download rule |

### Search
| `POST /search/start` body `pattern=&plugins=all&category=all` | start search |
| `GET /search/results?id=` | results |
| `POST /search/stop` body `id=` | stop |

### Logs
| `GET /log/main?normal=true&info=true&warning=true&critical=true&last_known_id=` | log entries |
| `GET /log/peers?last_known_id=` | banned/connected peers |

## Pitfalls

- **Form-encoding required** for almost every endpoint, not JSON. Use `URLSearchParams` or `FormData`.
- `/torrents/info` returns array even with one torrent; check length.
- `state` values: `error`, `missingFiles`, `uploading`, `pausedUP`, `queuedUP`, `stalledUP`, `checkingUP`, `forcedUP`, `allocating`, `downloading`, `metaDL`, `pausedDL`, `queuedDL`, `stalledDL`, `checkingDL`, `forcedDL`, `checkingResumeData`, `moving`, `unknown`. UI needs a mapping.
- Use `/sync/maindata` rather than polling `/torrents/info` — way less bandwidth, gives torrent additions/removals as deltas (`torrents_removed[]`).
- `eta` of `8640000` (= 100 days) means "infinite" / unknown.
- `priority` of `-1` for queue position means "not queued" (e.g., force-started or seeding).
- Tag/category names may contain commas — qBit doesn't escape them in `tags` field. Avoid commas in tag names.
- Login with wrong creds returns `200 "Fails."` (text body) — check body, not status.
- Hashes are SHA-1 hex (40 chars) for v1 torrents, SHA-256 (64 chars) for v2 torrents. Some endpoints want `infohash_v1` / `infohash_v2` separately.

## Reference

- Official: <https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)>
- Latest changes: <https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-5.0)>
