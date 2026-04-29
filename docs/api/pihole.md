# Pi-hole — REST API v6

Base: `${VITE_PIHOLE_URL}/api` · Auth: session-based — POST password to `/auth`, then send returned `sid` as `sid:` header (or `?sid=` query) on subsequent calls.

⚠ **Key is browser-visible** in current setup ([src/lib/hooks.js](../../src/lib/hooks.js) — `VITE_PIHOLE_KEY`). For LAN dashboards it's acceptable but if you ever expose this UI publicly, move auth into the proxy.

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `usePihole()`. Proxy: `/api/pihole/*`.

## Endpoints we use
| Path | Method | Returns |
|------|--------|---------|
| `/auth` | POST `{password}` | `{session:{valid, sid, validity, ...}}` — store `sid` |
| `/stats/summary` | GET | `{queries:{total, blocked, percent_blocked, unique_domains, forwarded, cached}, clients:{active, total}, gravity:{...}}` |

## Other useful endpoints
### Stats
| `GET /stats/query_types` | `{querytypes:{A:n, AAAA:n, ...}}` |
| `GET /stats/upstreams` | per-upstream forwarded count |
| `GET /stats/top_domains?count=10&blocked=false` | top permitted/blocked domains |
| `GET /stats/top_clients?count=10&blocked=false` | top clients by query count |
| `GET /stats/recent_blocked?count=10` | recently blocked domains |
| `GET /stats/database/summary?from=&until=` | long-term query stats from FTL DB |
| `GET /stats/database/query_types?from=&until=` | historical query types |
| `GET /stats/database/top_domains?...` | historical top domains |
| `GET /history?N=144` | timeseries (10-min buckets by default; `N` = bucket count) |
| `GET /history/clients?N=144` | per-client timeseries |
| `GET /history/database?from=&until=` | long-term timeseries |

### Live / queries
| `GET /queries?length=100&from=&until=&domain=&client=&upstream=&type=&status=` | recent queries (FTL ring buffer) — `queries[]` with `time`, `type`, `domain`, `client`, `status`, `reply`, `dnssec`, `upstream` |
| `GET /queries/suggestions` | autocomplete suggestions for filter UIs |

### Lists / blocking
| `GET /domains/{type}` (`allow`/`deny`) | per-list domains; query `?type=exact|regex` |
| `POST /domains/{type}/{kind}` body `{domain, comment, enabled, groups}` | add |
| `PUT /domains/{type}/{kind}/{domain}` | edit |
| `DELETE /domains/{type}/{kind}/{domain}` | remove |
| `GET /lists?type=allow|block` | configured adlists |
| `POST /lists` body `{address, type, comment, groups, enabled}` | add adlist |
| `POST /action/gravity` | trigger gravity update (rebuild blocklists) |
| `POST /action/restartdns` | restart pihole-FTL |
| `POST /action/flush/logs` / `/action/flush/arp` | maintenance |

### Blocking control
| `GET /dns/blocking` | `{blocking:"enabled"|"disabled", timer}` |
| `POST /dns/blocking` body `{blocking:true, timer:300}` | disable for N seconds |

### Clients / groups
| `GET /clients` / `POST /clients` / `PUT /clients/{id}` / `DELETE /clients/{id}` | client records |
| `GET /groups` / mutators | groups |

### Network
| `GET /network/devices` | discovered devices (from Pi-hole's network table) |
| `GET /network/interfaces` | host interfaces |
| `GET /network/gateway` | gateway info |

### System / config
| `GET /info/version` | `{version:{core, web, ftl, docker}}` |
| `GET /info/system` | uptime, memory, CPU |
| `GET /info/sensors` | host sensors |
| `GET /info/host` | hostname, kernel |
| `GET /info/login` | login config |
| `GET /info/messages` | system messages (warnings) |
| `GET /info/ftl` | FTL stats — `privacy_level`, `database_size`, `gravity_size` |
| `GET /config` / `PATCH /config` | full config tree (replaces `setupVars.conf`) |
| `GET /endpoints` | OpenAPI-ish list of all endpoints |
| `POST /auth/totp` | TOTP enrollment if 2FA enabled |
| `DELETE /auth` | logout |

## Auth flow
```
POST /api/auth  {password:"..."}
  → 200 {session:{valid:true, sid:"abc...", validity:1800}}
GET  /api/stats/summary  -H 'sid: abc...'
```
Session expiry resets on each call by default; configurable via `webserver.api.session.expire`. If `password` is empty (no admin password) `/auth` returns success with no `sid`.

## Pitfalls
- v5 used `?auth=<token>` and `/admin/api.php`. **v6 broke that** — completely new namespace under `/api/`, password-derived session.
- Server returns `401` on expired sid; re-auth and retry.
- `percent_blocked` is already a percentage (not 0–1).
- `from`/`until` are unix epoch **seconds**.
- Setting blocking to "disabled" with `timer:0` disables permanently; non-zero is seconds.
- Some installs run behind reverse proxy with `/admin/` prefix — adjust base accordingly.
- Local API spec: `${PIHOLE_URL}/api/docs/` (FTL embeds Swagger).

## Reference
- Source: <https://github.com/pi-hole/FTL>
- API docs (per-version, generated): <https://docs.pi-hole.net/api/>
