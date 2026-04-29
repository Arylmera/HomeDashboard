# Nextcloud — OCS API

Base: `${VITE_NEXTCLOUD_URL}` · Auth: HTTP Basic (username + app password) **or** Bearer (OAuth2). Required header on every call: `OCS-APIRequest: true`. JSON: `?format=json` (or `Accept: application/json`).

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useNextcloud()`. Proxy: `/api/nextcloud/*`.

## Endpoints we use
| Path | Returns |
|------|---------|
| `/ocs/v1.php/cloud/user?format=json` | logged-in user — `id`, `display-name`, `email`, `quota:{free, used, total, relative}`, `storageLocation`, `groups`, `enabled` |

## Other useful endpoints
### User / quota
| `GET /ocs/v1.php/cloud/users/{userid}` | per-user data (admin only for other users) |
| `GET /ocs/v1.php/cloud/users` | all users (admin) |
| `PUT /ocs/v1.php/cloud/users/{userid}/disable` / `/enable` | toggle |
| `GET /ocs/v2.php/apps/user_status/api/v1/user_status` | online/offline/dnd status |

### Capabilities / system
| `GET /ocs/v1.php/cloud/capabilities` | feature/version map — useful for feature-detection in clients |
| `GET /status.php` | unauthenticated server status — `installed`, `maintenance`, `version`, `versionstring`, `productname`, `extendedSupport` |
| `GET /ocs/v2.php/apps/serverinfo/api/v1/info?format=json` (requires `serverinfo` app + admin) | full system snapshot — `nextcloud:{system:{cpuload, memory, disk}, storage:{num_users, num_files}}, server`, `activeUsers`, `php` |

### Files (WebDAV — not OCS but lives here)
| `PROPFIND /remote.php/dav/files/{userid}/` (XML body) | directory listing (sizes, mtime) |
| `GET /remote.php/dav/files/{userid}/path/file` | download |
| `PUT /remote.php/dav/files/{userid}/path/file` | upload |
| `MKCOL /remote.php/dav/files/{userid}/path/` | create folder |
| `MOVE` / `COPY` / `DELETE` | mutate |

### Sharing
| `GET /ocs/v2.php/apps/files_sharing/api/v1/shares?path=&reshares=true&shared_with_me=false` | shares for path |
| `POST /ocs/v2.php/apps/files_sharing/api/v1/shares` body `{path, shareType, permissions, password, expireDate}` | create — `shareType`: 0=user, 1=group, 3=public link, 4=email, 7=remote |
| `DELETE /ocs/v2.php/apps/files_sharing/api/v1/shares/{id}` | revoke |

### Activity / notifications
| `GET /ocs/v2.php/apps/activity/api/v2/activity/all?format=json&since=&limit=50` | activity feed |
| `GET /ocs/v2.php/apps/notifications/api/v2/notifications` | pending notifications |
| `DELETE /ocs/v2.php/apps/notifications/api/v2/notifications` | clear all |

### Groups / talk / calendar / contacts
| `GET /ocs/v1.php/cloud/groups` | groups |
| `GET /ocs/v2.php/apps/spreed/api/v4/room` | Talk rooms |
| `GET /remote.php/dav/calendars/{userid}/` (PROPFIND) | calendars |
| `GET /remote.php/dav/addressbooks/users/{userid}/` (PROPFIND) | address books |

## Auth
- **App passwords**: Settings → Security → "Create new app password". Use these instead of the account password (revocable, scoped to API).
- OAuth2: `Settings → OAuth 2.0 clients`. Standard authorization-code flow. Token endpoint: `/apps/oauth2/api/v1/token`.

## Response shape
OCS wraps everything:
```json
{ "ocs": {
    "meta": { "status": "ok", "statuscode": 100, "message": "OK" },
    "data": { ... }
} }
```
Statuscodes: 100 ok, 102 server error, 104 forbidden, 996 server error, 997 unauthorized, 998 not found, 999 unknown. **HTTP status is usually 200 even on logical errors** — always check `meta.statuscode`.

## Pitfalls
- Forget `OCS-APIRequest: true` → 401.
- `quota.free` is `-3` when "no quota set" (unlimited). Test for negative before computing percent.
- v1 vs v2 OCS paths exist; pick by what each app exposes — they're not interchangeable.
- WebDAV PROPFIND uses XML bodies and `Depth: 0|1|infinity` header. Library `cadaver`/JS `webdav-client` handles this better than hand-rolled fetch.
- `versionstring` differs from `version` array (`[28,0,4,1]` vs `"28.0.4"`).
- Maintenance mode → `/status.php` returns `maintenance: true` and most APIs 503.

## Reference
- OCS docs: <https://docs.nextcloud.com/server/latest/developer_manual/client_apis/OCS/>
- WebDAV: <https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/>
- ServerInfo app API: <https://github.com/nextcloud/serverinfo>
