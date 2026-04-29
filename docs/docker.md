# Docker

Multi-stage build (`build` → `runtime`), BuildKit-enabled.

## Rules

- **Use the existing two-stage layout.** Stage 1 compiles native modules (`better-sqlite3` needs `python3 make g++`). Stage 2 is the lean runtime — no compilers, no source.
- **Order matters for cache.** Copy `package.json` + lockfile, run `npm ci`, *then* copy the rest. Re-running with unchanged deps reuses the npm install layer.
- **`npm ci`, not `npm install`.** CI installs are deterministic and fail loud on a stale lockfile.
- **Build-time vars** (`VITE_*_URL`) are passed via `--build-arg` and become `ENV` so Vite's `loadEnv` picks them up. They are public — they end up in the bundle.
- **Runtime secrets** (`*_API_KEY`, `*_TOKEN`, `*_PASS`) are **never** `ARG`/`ENV` in the Dockerfile. They come in via `docker run -e …`, compose `env_file`, or orchestrator secrets.
- **Pin base image** to a major (`node:20-alpine`). Avoid `:latest`. Bump deliberately.
- **Volumes for state.** `/data` holds the SQLite DB. Don't write state anywhere else — it'll vanish on container replacement.
- **HEALTHCHECK** present and meaningful (a real HTTP probe, not just `true`).
- **Run as non-root** when feasible. Current image runs as root inside `node:20-alpine`; if hardening, add a `USER node` line and `chown` `/data`.

## Build locally

```bash
docker build \
  --build-arg VITE_TRUENAS_URL=https://nas.example \
  -f docker/Dockerfile \
  -t homedashboard:dev .
docker run --rm -p 4173:4173 --env-file .env homedashboard:dev
```

## Pitfalls

- `docker/Dockerfile.dockerignore` (BuildKit picks up `<dockerfile>.dockerignore` next to the Dockerfile) must exclude `node_modules`, `dist`, `.env*`. Otherwise the host's native modules poison the image and secrets leak.
- BuildKit's `# syntax=docker/dockerfile:1.7` line must be the first line of the file.
