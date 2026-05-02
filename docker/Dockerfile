# syntax=docker/dockerfile:1.7

# ─── build stage ───────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Build toolchain for native modules (better-sqlite3).
RUN apk add --no-cache python3 make g++

# Install deps (cache-friendly)
COPY package.json package-lock.json* ./
RUN npm ci

# Build-time public env (baked into bundle).
# Pass via `docker build --build-arg VITE_FOO=...` or GitLab CI variables.
ARG VITE_TRUENAS_URL
ARG VITE_PLEX_URL
ARG VITE_SONARR_URL
ARG VITE_RADARR_URL
ARG VITE_LIDARR_URL
ARG VITE_PROWLARR_URL
ARG VITE_TAUTULLI_URL
ARG VITE_SEERR_URL
ARG VITE_PIHOLE_URL
ARG VITE_PIHOLE_KEY
ARG VITE_SPEEDTEST_URL
ARG VITE_AUDIOBOOKSHELF_URL
ARG VITE_QBITTORRENT_URL
ARG VITE_GLANCES_URL
ARG VITE_BESZEL_URL
ARG VITE_NEXTCLOUD_URL
ARG VITE_NPM_URL
ARG HOMEY_ID

ENV VITE_TRUENAS_URL=$VITE_TRUENAS_URL \
    VITE_PLEX_URL=$VITE_PLEX_URL \
    VITE_SONARR_URL=$VITE_SONARR_URL \
    VITE_RADARR_URL=$VITE_RADARR_URL \
    VITE_LIDARR_URL=$VITE_LIDARR_URL \
    VITE_PROWLARR_URL=$VITE_PROWLARR_URL \
    VITE_TAUTULLI_URL=$VITE_TAUTULLI_URL \
    VITE_SEERR_URL=$VITE_SEERR_URL \
    VITE_PIHOLE_URL=$VITE_PIHOLE_URL \
    VITE_PIHOLE_KEY=$VITE_PIHOLE_KEY \
    VITE_SPEEDTEST_URL=$VITE_SPEEDTEST_URL \
    VITE_AUDIOBOOKSHELF_URL=$VITE_AUDIOBOOKSHELF_URL \
    VITE_QBITTORRENT_URL=$VITE_QBITTORRENT_URL \
    VITE_GLANCES_URL=$VITE_GLANCES_URL \
    VITE_BESZEL_URL=$VITE_BESZEL_URL \
    VITE_NEXTCLOUD_URL=$VITE_NEXTCLOUD_URL \
    VITE_NPM_URL=$VITE_NPM_URL \
    HOMEY_ID=$HOMEY_ID

COPY . .
RUN npm run build

# ─── runtime stage ─────────────────────────────────────────────
# `vite preview` is used as the runtime server because it carries the
# server-side proxy logic that injects auth headers (so secrets never
# reach the browser). Runtime secrets are read from process.env.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4173 \
    PREFS_DB=/data/prefs.db

COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/vite.config.js ./vite.config.js
COPY --from=build /app/src/server ./src/server
COPY --from=build /app/index.html /app/nas.html /app/plex.html /app/homey.html /app/quicklinks.html /app/docker.html /app/network.html ./

# Persistent SQLite store (mount a volume here in compose).
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4173/ >/dev/null 2>&1 || exit 1

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
