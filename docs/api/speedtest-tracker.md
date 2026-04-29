# Speedtest Tracker — REST API v2

Base: `${VITE_SPEEDTEST_URL}/api` · Auth: bearer token (Sanctum) — `Authorization: Bearer <token>`. Some installs allow public reads if "API enabled w/o auth" is on.

Used in: [src/lib/hooks.js](../../src/lib/hooks.js) `useSpeedtest()`. Proxy: `/api/speedtest/*`.

The "v2" rewrite (alexjustesen/speedtest-tracker — Laravel/Filament) replaced the legacy henrywhitaker3 fork. APIs differ.

## Endpoints we use
| Path | Returns |
|------|---------|
| `/speedtest/latest` | latest result — `{data:{download, upload, ping, packet_loss, server_id, server_name, server_host, isp, scheduled, healthy, comments, created_at}}` |

`download`/`upload` units depend on version: legacy returned **Mbps**; current returns **bytes/sec** when "Use bits per second" is off, **bits/sec** when on. The hook auto-normalizes to Mbps via heuristic; ideally inspect once with `/api/speedtest/server` and lock the unit setting.

## Other endpoints
| Path | Returns |
|------|---------|
| `GET /speedtest/list?per_page=20&page=1` | history (paginated) |
| `GET /speedtest/{id}` | single result detail |
| `POST /speedtest/run` | trigger an on-demand test (returns 202; poll `latest`) |
| `DELETE /speedtest/{id}` | delete a result |
| `GET /healthcheck` | container health |

## Settings (admin token only)
| `GET /settings` / `PATCH /settings` | schedule, threshold alerts, server preference |

## Webhooks / notifications
Configured via UI; outbound to Slack/Discord/Telegram/Pushover/Webhook on threshold breach (download/upload/ping). No API to manage these in v2 yet — UI only.

## Pitfalls
- **Unit ambiguity** is the biggest trap. Pin "Display in bits per second" in settings, or always normalize defensively (the `bpsToMbps` helper in hooks.js does this).
- `data.ping` is ms (float). `packet_loss` is percent (0–100).
- `created_at` is ISO 8601 with timezone — render with `Date(created_at).toLocaleString()`.
- Triggering tests is rate-limited (default 1/min); honor 429.
- Old fork (`henrywhitaker3/speedtest-tracker`) used `/api/speedtest/latest` returning a different shape (`download_speed`, `upload_speed`); the hook handles both via fallback.
- The Ookla CLI under the hood requires accepting their license — usually pre-accepted in the image, but a fresh install may emit `LicenseRequired` errors visible in `comments`.

## Reference
- Source: <https://github.com/alexjustesen/speedtest-tracker>
- Docs: <https://docs.speedtest-tracker.dev/>
- API guide: <https://docs.speedtest-tracker.dev/getting-started/api>
