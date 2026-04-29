# Tautulli — REST API v2

Base: `${VITE_TAUTULLI_URL}/api/v2` · Auth: `?apikey=<key>` query (proxy injects).

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useTautulli()`. Proxy: `/api/tautulli/*`.

All calls use `?cmd=<command>&...`. Response envelope: `{response: {result: "success"|"error", message, data}}`.

## Commands we use
| `cmd` | Returns |
|-------|---------|
| `get_home_stats&time_range=7&stats_count=5` | `data[]` of stat blocks — `top_movies`, `top_tv`, `top_music`, `top_users`, `top_platforms`, `most_concurrent` |
| `get_activity` | `data` — `stream_count`, `stream_count_direct_play`, `stream_count_transcode`, `total_bandwidth`, `lan_bandwidth`, `wan_bandwidth`, `sessions[]` |

## Useful additional commands
### History / activity
| `cmd` | Returns |
|-------|---------|
| `get_history&user_id=&length=25` | playback history |
| `get_user_watch_time_stats&user_id=&query_days=1,7,30` | per-user watch time |
| `get_user_player_stats&user_id=` | players used |
| `get_recently_added&count=10&media_type=movie` | recently added |
| `get_plays_by_date&time_range=30` | play count timeseries |
| `get_plays_by_dayofweek` | day-of-week histogram |
| `get_plays_by_hourofday` | hour-of-day histogram |
| `get_plays_by_top_10_platforms` / `_top_10_users` | leaderboards |
| `get_stream_type_by_top_10_platforms` | direct vs transcode breakdown |

### Library
| `cmd` | Returns |
|-------|---------|
| `get_libraries` | configured libraries |
| `get_library&section_id=` | library detail incl `count`, `parent_count`, `child_count` |
| `get_library_media_info&section_id=&order_column=file_size&order_dir=desc&length=25` | files sorted by size |
| `get_library_watch_time_stats&section_id=` | per-library watch time |

### Users / streams
| `get_users` | configured users |
| `get_user&user_id=` | user profile |
| `get_user_logins&user_id=&length=10` | login history |
| `terminate_session&session_key=&message=` | kill stream |

### System
| `get_server_info` | Plex server identity (proxied) |
| `get_servers_info` | all known PMS instances |
| `get_pms_update` | new Plex version available |
| `get_notifiers` | configured notification agents |
| `notify&notifier_id=&subject=&body=` | send manual notification |
| `arnold` | random Arnold quote (yes, really — debug ping) |

## Response patterns
- Activity sessions: `data.sessions[]` each has `user`, `full_title`, `view_offset`, `duration`, `transcode_decision` (`direct play`/`copy`/`transcode`), `bandwidth`, `quality_profile`, `player`, `state`.
- History rows: `recordsTotal`, `recordsFiltered`, `data[]` (with `started`, `stopped`, `duration`, `paused_counter`, `percent_complete`).
- Time fields are unix epoch seconds unless suffixed `_iso`.

## Auth
- Web UI → Settings → Web Interface → API. Key is rotatable.
- Tautulli does **not** support per-user keys — single shared admin key.

## Pitfalls
- `result: "error"` does not flip HTTP status — always check the envelope.
- `time_range` for stats is **days**; for plays-by-* it's also days.
- `media_type` values: `movie`, `episode` (not "tv"), `track`, `live`.
- `transcode_decision` "copy" means stream copy (audio transcode only or remux); not the same as direct play.
- `bandwidth` is kbps.
- Killing a session requires `terminate_session` + `session_key` (not `session_id`); message shown to user.

## Reference
- API docs: <https://github.com/Tautulli/Tautulli/wiki/Tautulli-API-Reference>
- Built-in: `${TAUTULLI}/docs/` lists all commands.
