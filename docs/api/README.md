# External APIs — reference

One file per upstream service the dashboard talks to. These are **not** library docs — they describe HTTP endpoints, auth quirks, response shapes, and pitfalls observed in this project.

Consult before adding new fetches; update when you discover a new endpoint or a gotcha.

| Service | Base path (proxy) | File |
|---------|-------------------|------|
| TrueNAS SCALE | `/api/truenas` | [truenas.md](truenas.md) |
| Glances v4 | `/api/glances` | [glances.md](glances.md) |
| Plex Media Server | `/api/plex` | [plex.md](plex.md) |
| Sonarr / Radarr / Lidarr / Readarr / Prowlarr | `/api/{svc}` | [arr.md](arr.md) |
| qBittorrent | `/api/qbittorrent` | [qbittorrent.md](qbittorrent.md) |
| Beszel | `/api/beszel` | [beszel.md](beszel.md) |
| Tautulli | `/api/tautulli` | [tautulli.md](tautulli.md) |
| Overseerr / Jellyseerr | `/api/seerr` | [overseerr.md](overseerr.md) |
| Pi-hole v6 | `/api/pihole` | [pihole.md](pihole.md) |
| Speedtest Tracker | `/api/speedtest` | [speedtest-tracker.md](speedtest-tracker.md) |
| Nextcloud | `/api/nextcloud` | [nextcloud.md](nextcloud.md) |
| iCloud (CalDAV) | `/api/icloud` | [icloud.md](icloud.md) |
| Audiobookshelf | `/api/audiobookshelf` | [audiobookshelf.md](audiobookshelf.md) |
| Open-Meteo | direct (no proxy) | [open-meteo.md](open-meteo.md) |
| Homey Pro | `/api/homey` (planned) | [homey.md](homey.md) |

## Conventions

- **Auth lives in the proxy**, never in `VITE_*` (browser-visible) — except Pi-hole's `VITE_PIHOLE_KEY`, which is acceptable on a LAN-only deployment but should move server-side if the dashboard goes public.
- All hooks return `{state: "loading"|"live"|"error", ...}`. New endpoints should preserve this contract.
- Polling intervals encoded in [src/lib/hooks.js](../../src/lib/hooks.js); raise them before adding more parallel calls.
- Each doc lists **what we use**, **what's available** (so you don't spelunk through Swagger), and **pitfalls** (always read these — they encode bugs we already hit).

## When adding a new API

1. Create `docs/api/<service>.md` following the existing template:
   - Base + auth header
   - Endpoints we use
   - Other useful endpoints (table)
   - Pitfalls
   - Reference links
2. Add a row to the table above.
3. Add the proxy in [vite.config.js](../../vite.config.js).
4. Add a hook in [src/lib/hooks.js](../../src/lib/hooks.js).
5. Add `VITE_<SVC>_URL` (and any token) to [.env.example](../../.env.example).
