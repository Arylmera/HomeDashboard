# Beszel — REST API

Lightweight server monitoring (CPU, memory, disk, network, container stats). Built on **PocketBase** — its API is the standard PocketBase HTTP interface, not a bespoke design.

Base: `${VITE_BESZEL_URL}` · Auth: PocketBase token (NOT HTTP Basic — current proxy is wrong, see "Pitfalls").

Used in: not yet wired. Proxy: `/api/beszel/*` → upstream.

## Auth flow

```
POST /api/collections/users/auth-with-password
Content-Type: application/json
Body: {"identity":"<email>","password":"<pass>"}

→ 200 {
  "token": "eyJhbGc…",
  "record": { "id":"…", "email":"…", "verified":true, … }
}
```

Subsequent calls send `Authorization: <token>` (PocketBase v0.23+ accepts the bare token; older versions wanted `Bearer <token>`). Token TTL is 7 days by default.

For SSO / OAuth providers, use `/api/collections/users/auth-with-oauth2`.

## Useful endpoints

### Systems (monitored hosts)
| Path | Returns |
|------|---------|
| `GET /api/collections/systems/records?perPage=50&sort=-updated` | hosts — `id`, `name`, `host`, `port`, `users[]`, `info:{cpu, m, du, dr, dw, h, k, l, oc, n, t, u, v, ic, im}`, `status` (`up`/`down`/`paused`), `updated` |
| `GET /api/collections/systems/records/{id}` | single host |
| `POST /api/collections/systems/records` body `{name, host, port, users}` | add host |
| `PATCH /api/collections/systems/records/{id}` | edit |
| `DELETE /api/collections/systems/records/{id}` | remove |

### Metrics (timeseries)
| Path | Returns |
|------|---------|
| `GET /api/collections/system_stats/records?filter=system='{id}'&sort=-created&perPage=720` | per-host stats — `cpu`, `m` (mem %), `mu` (mem used), `mt` (mem total), `du` (disk used %), `db` (disk used bytes), `dt` (disk total), `dr` / `dw` (disk read/write rate), `nr` / `ns` (net rx/tx rate), `b` (bandwidth), `t` (load), created |
| `GET /api/collections/container_stats/records?filter=system='{id}'` | per-container — `name`, `c` (CPU %), `m` (mem MB), `nr`, `ns` |

PocketBase filter syntax: `filter=system='ID' && created >= '2024-01-01 00:00:00.000Z'`. URL-encode commas/quotes.

### Alerts
| `GET /api/collections/alerts/records?filter=user='{userId}'` | configured alerts — type (cpu/mem/disk/status), threshold, value, system |
| `POST /api/collections/alerts/records` | create |
| `PATCH /api/collections/alerts/records/{id}` | edit (acknowledge, snooze) |

### Users / settings
| `GET /api/collections/users/records/{id}` | user profile |
| `PATCH /api/collections/users/records/{id}` body `{settings:{theme, units, …}}` | preferences |

### Realtime (Server-Sent Events)
| `GET /api/realtime` (SSE) → after first response, send `POST /api/realtime` with `{clientId, subscriptions:["systems/{id}"]}` to subscribe |

Push-based updates beat polling for any stat that changes more than once per minute.

### Server info
| `GET /api/health` | unauth health (`{code:200, message:"API is healthy."}`) |
| `GET /api/settings` | server config (admin only) |

## PocketBase response shape

List endpoints wrap with pagination:
```json
{
  "page": 1, "perPage": 30, "totalItems": 42, "totalPages": 2,
  "items": [ { "id":"…", "collectionId":"…", "created":"…", … } ]
}
```

Single record returns the record directly. Errors:
```json
{ "code": 400, "message": "Failed to authenticate.", "data": {} }
```

## Pitfalls

- **Current Vite proxy uses HTTP Basic** ([vite.config.js:120](../../vite.config.js)) — that's wrong for PocketBase. Auth must be a token from `/api/collections/users/auth-with-password`. Either:
  - Move auth fully client-side: hook calls `auth-with-password` once, stores token in memory, sends `Authorization` header on subsequent calls. Proxy stays passthrough.
  - Or do the login server-side in a small Vite middleware and inject the token. More involved.
- Token expires after 7 days — refresh by re-authenticating, or call `POST /api/collections/users/auth-refresh` with the current token before it expires.
- Field names are short (`m`, `du`, `dr`, …) to keep records small. Map them in the hook.
- Stats records accumulate fast (every 60s by default). Always paginate + sort `-created`; never `perPage=0`.
- Beszel runs an *agent* on each monitored host that pushes to the hub via WebSocket — agents need to reach the hub, not the other way around. The API only exposes the hub.
- PocketBase admin token (`/api/admins/auth-with-password`) gives broader access than user tokens — use a regular user account for the dashboard.

## Reference

- Beszel: <https://github.com/henrygd/beszel>
- PocketBase API: <https://pocketbase.io/docs/api-records/>
- Auth methods: <https://pocketbase.io/docs/authentication/>
- Realtime: <https://pocketbase.io/docs/api-realtime/>
