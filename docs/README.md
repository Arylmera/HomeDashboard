# HomeDashboard — Documentation

Reference for stack used in this project. Each file = good practices for one tech.

## Stack overview

| Layer       | Tech                                          | File |
|-------------|-----------------------------------------------|------|
| Language    | JavaScript (ESM, ES2022+)                     | [javascript.md](javascript.md) |
| UI          | React 18 + JSX                                | [react.md](react.md) |
| Build/dev   | Vite 5 + `@vitejs/plugin-react`               | [vite.md](vite.md) |
| Runtime     | Node.js 20 (alpine)                           | [nodejs.md](nodejs.md) |
| Storage     | better-sqlite3 (synchronous SQLite)           | [better-sqlite3.md](better-sqlite3.md) |
| Styling     | Plain CSS (per-page bundles)                  | [css.md](css.md) |
| Container   | Docker (multi-stage, BuildKit)                | [docker.md](docker.md) |
| CI/CD       | GitHub Actions + GHCR                         | [github-actions.md](github-actions.md) |
| Deployment  | Docker Compose                                | [docker-compose.md](docker-compose.md) |
| Versioning  | Git                                           | [git.md](git.md) |

## External APIs

Endpoint reference for upstream services the dashboard polls — see [api/README.md](api/README.md).
One file per service: TrueNAS, Glances, Plex, *arr, Tautulli, Overseerr, Pi-hole, Speedtest, Nextcloud, Audiobookshelf, Open-Meteo, Homey.

## How to use

When writing code or reviewing PRs, consult the relevant file for conventions
and pitfalls. Files are intentionally short — they encode rules, not tutorials.
