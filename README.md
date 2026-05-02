# Arylmera Home Dashboard

Personal homelab dashboard. Vite + React multi-page app with a thin Node
middleware layer that proxies upstream services and keeps every secret
server-side.

## Quickstart

```bash
cp .env.example .env   # fill in only the services you actually run
npm install
npm run dev
```

Open http://localhost:5173/ for **Home**. Sibling pages:

| Page | Path | What it shows |
|------|------|---------------|
| Home        | `/`               | Calendar, reminders, quick stats, container updates, weather |
| NAS         | `/nas.html`       | TrueNAS pools, datasets, apps, alerts |
| Plex        | `/plex.html`      | Library counts, now-playing, Tautulli history, *arr queues |
| Homey       | `/homey.html`     | Live zones, devices, flows, moods, logic variables |
| Network     | `/network.html`   | Pi-hole, Speedtest, ASUS router, Nginx Proxy Manager |
| Docker      | `/docker.html`    | Arcane container list, Tugtainer update digest |
| Quicklinks  | `/quicklinks.html`| Editable launcher grid with live health probes |

## Build & preview

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ on :4173 with the same proxies
```

## How the proxy layer works

The browser only ever calls `/api/<service>/...`. Vite's middleware (in
`src/server/*` + the proxy table in `vite.config.js`) rewrites those paths
to the real upstream and injects the right auth — Bearer, `X-Api-Key`,
`X-Plex-Token`, Basic auth, or query-string keys depending on the service.

Secrets are read from `process.env` at request time, so:

- **`VITE_*` vars** end up in the browser bundle — only base URLs.
- **Bare vars** (`TRUENAS_API_KEY`, `PLEX_TOKEN`, …) stay on the server.

Leave any service blank in `.env` and its panel hides or greys-out — the
rest of the dashboard keeps working.

## Server-side middleware

A few integrations are too stateful for a static proxy table and live in
`src/server/`:

- **`prefs.js`** — SQLite (better-sqlite3) at `/data/prefs.db` for
  per-user UI prefs (collapsed zones, quicklinks layout, etc.).
- **`homey-oauth.js`** — full OAuth2 dance with Homey Cloud, token
  storage + refresh, and an authenticated proxy.
- **`icloud.js`** — CalDAV against iCloud using an app-specific password,
  surfaces calendar events + Reminders on Home.
- **`npm.js`** — Nginx Proxy Manager identity → bearer token exchange,
  cached in memory.
- **`asus.js`** — Asuswrt over SSH (ssh2) for live router stats.
- **`health.js`** — backend health probes that drive the quicklinks
  status dots (no CORS dance in the browser).
- **`metrics.js`** — lightweight aggregator endpoints for Home cards.

## Supported services

Configurable via `.env` (see [.env.example](.env.example) for the full
list and notes per service):

TrueNAS Scale · Plex · Tautulli · Sonarr · Radarr · Lidarr · Prowlarr ·
Overseerr · Pi-hole v6 · Speedtest Tracker · Audiobookshelf ·
qBittorrent · Qui · Glances · Beszel · NextCloud · Arcane · Tugtainer ·
Homey Pro (cloud OAuth2) · iCloud (CalDAV) · Nginx Proxy Manager ·
ASUS router (SSH).

## Production deploy

`npm run build` produces a static `dist/` with seven HTML entries, but the
**proxy + middleware layer is required at runtime** — secrets must not
move to the browser. Two supported paths:

1. **Run the Node server** (`npm run preview` or the provided
   `docker/Dockerfile`). The container exposes :4173 and reads every
   `.env` value from the runtime environment.
2. **Front it with your own reverse proxy** (nginx, Caddy) that
   replicates every `/api/<svc>/*` rewrite + header injection from
   `vite.config.js`. This is more work; the container path is preferred.

See [docs/docker.md](docs/docker.md) and
[docs/docker-compose.md](docs/docker-compose.md) for the container setup
(including the `/data` volume for the SQLite prefs DB).

## Layout

```
.
├── index.html  nas.html  plex.html  homey.html
├── network.html  docker.html  quicklinks.html
├── vite.config.js                  # multi-page input + per-service proxies
└── src/
    ├── server/                     # prefs, homey-oauth, icloud, npm, asus, health, metrics
    ├── styles/                     # forge.css, space-bg.css, per-page CSS
    ├── lib/                        # icons, services, hooks, arylmera-menu
    └── pages/{home,nas,plex,homey,network,docker,quicklinks}/main.jsx
```

## Docs

Project conventions, per-tech rules, and per-API integration notes live
in [docs/](docs/). Read the relevant file before editing code in that
area — the table in [CLAUDE.md](CLAUDE.md) maps each subsystem to its doc.

## Out of scope

- TypeScript.
- Auth in front of the dashboard (assume LAN-only or fronted by NPM/SSO).
- Tests.
