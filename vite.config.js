import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'node:path';
import { prefsPlugin } from './src/server/prefs.js';
import { homeyOAuthPlugin } from './src/server/homey-oauth.js';
import { healthPlugin } from './src/server/health.js';
import { icloudPlugin } from './src/server/icloud.js';
import { npmPlugin } from './src/server/npm.js';
import { metricsPlugin } from './src/server/metrics.js';
import { asusPlugin } from './src/server/asus.js';
import { wanPlugin } from './src/server/wan.js';
import { spotifyOAuthPlugin } from './src/server/spotify-oauth.js';
import { sonosLanPlugin } from './src/server/sonos-lan.js';
import { precompressPlugin, precompressServePlugin } from './src/server/precompress.js';
import { multiPlugin } from './src/server/multi.js';

/**
 * Build a proxy entry that:
 *   - rewrites /api/<svc>/* → upstream
 *   - injects auth headers server-side so secrets never reach the browser
 */
/**
 * Build a proxy entry. `headers` is a function `() => ({...})` so values
 * resolve at request-time from `process.env` (runtime secrets in container)
 * rather than being captured at config load.
 */
function proxy({ target, rewrite, headers }) {
  if (!target) return null;
  return {
    target,
    changeOrigin: true,
    secure: false,
    rewrite,
    configure: (px) => {
      px.on('proxyReq', (req) => {
        const h = typeof headers === 'function' ? headers() : headers;
        if (h) for (const [k, v] of Object.entries(h)) if (v) req.setHeader(k, v);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Server-side middleware (homeyOAuthPlugin, prefs.js) reads its config
  // via process.env. Copy non-VITE_ keys over so .env values reach them
  // in dev. (In containers, process.env is already populated by Docker.)
  // Copy every .env value to process.env (including VITE_* — middleware
  // sometimes needs the public host URL too, e.g. NPM). In containers
  // process.env is already populated by Docker.
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  const proxies = {};
  const add = (path, p) => { if (p) proxies[path] = p; };

  const rt = (k) => process.env[k] || env[k] || '';

  // TrueNAS — Bearer token
  add('/api/truenas', proxy({
    target: env.VITE_TRUENAS_URL,
    rewrite: (p) => p.replace(/^\/api\/truenas/, ''),
    headers: () => { const t = rt('TRUENAS_API_KEY'); return { Authorization: t ? `Bearer ${t}` : '' }; },
  }));

  // Plex — X-Plex-Token query/header
  add('/api/plex', proxy({
    target: env.VITE_PLEX_URL,
    rewrite: (p) => p.replace(/^\/api\/plex/, ''),
    headers: () => ({ 'X-Plex-Token': rt('PLEX_TOKEN'), Accept: 'application/json' }),
  }));

  // Sonarr / Radarr / Lidarr / Prowlarr — X-Api-Key
  for (const svc of ['sonarr', 'radarr', 'lidarr', 'prowlarr']) {
    const upper = svc.toUpperCase();
    add(`/api/${svc}`, proxy({
      target: env[`VITE_${upper}_URL`],
      rewrite: (p) => p.replace(new RegExp(`^/api/${svc}`), ''),
      headers: () => ({ 'X-Api-Key': rt(`${upper}_API_KEY`) }),
    }));
  }

  // Tautulli — apikey injected as query param (server-side)
  if (env.VITE_TAUTULLI_URL) {
    proxies['/api/tautulli'] = {
      target: env.VITE_TAUTULLI_URL,
      changeOrigin: true,
      secure: false,
      rewrite: (p) => {
        const stripped = p.replace(/^\/api\/tautulli/, '');
        const k = rt('TAUTULLI_API_KEY');
        if (!k) return stripped;
        const sep = stripped.includes('?') ? '&' : '?';
        return `${stripped}${sep}apikey=${k}`;
      },
    };
  }

  // Seerr / Overseerr — X-Api-Key
  add('/api/seerr', proxy({
    target: env.VITE_SEERR_URL,
    rewrite: (p) => p.replace(/^\/api\/seerr/, ''),
    headers: () => ({ 'X-Api-Key': rt('SEERR_API_KEY') }),
  }));

  // Pi-hole v6 — uses session SID after /api/auth; client handles via header
  add('/api/pihole', proxy({
    target: env.VITE_PIHOLE_URL,
    rewrite: (p) => p.replace(/^\/api\/pihole/, ''),
  }));

  // Speedtest tracker — Bearer
  add('/api/speedtest', proxy({
    target: env.VITE_SPEEDTEST_URL,
    rewrite: (p) => p.replace(/^\/api\/speedtest/, ''),
    headers: () => { const t = rt('SPEEDTEST_API_KEY'); return { Authorization: t ? `Bearer ${t}` : '' }; },
  }));

  // Audiobookshelf — Bearer JWT
  add('/api/audiobookshelf', proxy({
    target: env.VITE_AUDIOBOOKSHELF_URL,
    rewrite: (p) => p.replace(/^\/api\/audiobookshelf/, ''),
    headers: () => { const t = rt('AUDIOBOOKSHELF_API_KEY'); return { Authorization: t ? `Bearer ${t}` : '' }; },
  }));

  // qBittorrent — cookie auth, client logs in via /api/v2/auth/login
  add('/api/qbittorrent', proxy({
    target: env.VITE_QBITTORRENT_URL,
    rewrite: (p) => p.replace(/^\/api\/qbittorrent/, ''),
  }));

  // Qui (qBit dashboard) — X-API-Key
  add('/api/qui', proxy({
    target: env.VITE_QUI_URL,
    rewrite: (p) => p.replace(/^\/api\/qui/, ''),
    headers: () => ({ 'X-API-Key': rt('QUI_API_KEY') }),
  }));

  // Glances v4 — no auth
  add('/api/glances', proxy({
    target: env.VITE_GLANCES_URL,
    rewrite: (p) => p.replace(/^\/api\/glances/, ''),
  }));

  // Beszel — basic auth
  add('/api/beszel', proxy({
    target: env.VITE_BESZEL_URL,
    rewrite: (p) => p.replace(/^\/api\/beszel/, ''),
    headers: () => {
      const u = rt('BESZEL_USER'), p = rt('BESZEL_PASS');
      return u && p ? { Authorization: `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}` } : {};
    },
  }));

  // NextCloud — basic auth
  add('/api/nextcloud', proxy({
    target: env.VITE_NEXTCLOUD_URL,
    rewrite: (p) => p.replace(/^\/api\/nextcloud/, ''),
    headers: () => {
      const u = rt('NEXTCLOUD_USER'), p = rt('NEXTCLOUD_PASS');
      return u && p
        ? { Authorization: `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`, 'OCS-APIRequest': 'true' }
        : {};
    },
  }));

  // Tugtainer (container update tracker) — uses public API
  // (set ENABLE_PUBLIC_API=true on the Tugtainer container).
  add('/api/tugtainer', proxy({
    target: env.VITE_TUGTAINER_URL,
    rewrite: (p) => p.replace(/^\/api\/tugtainer/, ''),
  }));

  // Arcane (docker manager) — X-Api-Key
  add('/api/arcane', proxy({
    target: env.VITE_ARCANE_URL,
    rewrite: (p) => p.replace(/^\/api\/arcane/, ''),
    headers: () => ({ 'X-Api-Key': rt('ARCANE_API_KEY') }),
  }));

  // Homey: handled entirely by homeyOAuthPlugin() — server-side OAuth2
  // flow, token storage, refresh, and proxy to the cloud-routed Homey.
  // No entry in `proxies` because the middleware needs async token
  // resolution which Vite's static proxy table can't express.

  return {
    plugins: [
      react(),
      // HTTPS for dev so Spotify (and any OAuth provider that mandates
      // https) accepts the redirect URI. Self-signed cert — your browser
      // will warn once; accept it. Use https://127.0.0.1:5173 (NOT
      // localhost — Spotify rejects the localhost host).
      ...(process.env.DEV_HTTPS === 'false' || process.env.NODE_ENV === 'production' ? [] : [basicSsl()]),
      prefsPlugin(), homeyOAuthPlugin(), spotifyOAuthPlugin(), sonosLanPlugin(),
      healthPlugin(), icloudPlugin(), npmPlugin(), asusPlugin(), wanPlugin(), metricsPlugin(),
      multiPlugin(),
      precompressPlugin(), precompressServePlugin(),
    ],
    server: { proxy: proxies, host: '127.0.0.1', https: process.env.DEV_HTTPS === 'false' ? false : {} },
    preview: { host: true, port: 4173, proxy: proxies, allowedHosts: true },
    build: {
      rollupOptions: {
        input: {
          home: resolve(__dirname, 'index.html'),
          nas: resolve(__dirname, 'nas.html'),
          plex: resolve(__dirname, 'plex.html'),
          homey: resolve(__dirname, 'homey.html'),
          apps: resolve(__dirname, 'apps.html'),
          docker: resolve(__dirname, 'docker.html'),
          network: resolve(__dirname, 'network.html'),
          music: resolve(__dirname, 'music.html'),
        },
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-dom/client'],
          },
        },
      },
    },
  };
});
