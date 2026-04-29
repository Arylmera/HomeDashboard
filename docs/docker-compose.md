# Docker Compose (deployment)

Used on the NAS to run the published image. See `docker/docker-compose.example.yml`.

## Rules

- **Pull from the registry**, don't build on the NAS. The `image:` field references the GitLab Registry tag.
- **Runtime secrets via `env_file: [.env]`.** The `.env` file lives next to the compose file on the NAS, not in git.
- **`PREFS_DB=/data/prefs.db`** must match the volume mount. If you change the path, change both.
- **Named volume** (`homedashboard-data`) for `/data`. Bind mounts also work but named volumes survive `docker compose down -v`-less teardowns.
- **`restart: unless-stopped`** so the NAS reboot brings the dashboard back, but a manual stop stays stopped.
- **Healthcheck mirrors the Dockerfile.** Compose-level healthcheck overrides the image one — keep them consistent.
- **Do not commit a real `.env`.** `.env.example` is committed; the real `.env` is `.gitignore`'d.

## Update flow on the NAS

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

## Pitfalls

- Forgetting to mount `/data` = losing prefs on every redeploy.
- Reverse-proxy fronting the dashboard? Make sure it forwards the `Host` header so `allowedHosts: true` in Vite preview is happy.
