# Arylmera Home Dashboard

Personal homelab dashboard. Vite + React multi-page app.

## Quickstart

```bash
cp .env.example .env   # fill in TrueNAS host + API key
npm install
npm run dev
```

Open http://localhost:5173/ for **Home**. Sibling pages live at `/nas.html`, `/plex.html`, `/homey.html`, `/quicklinks.html`.

## Build & preview

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ locally
```

## TrueNAS integration

The NAS panel calls `/api/truenas/api/v2.0/...` from the browser. The Vite dev
server proxies `/api/truenas/*` to `VITE_TRUENAS_URL` and injects the
`Authorization: Bearer ${TRUENAS_API_KEY}` header server-side, so the API key
never reaches the browser.

If `.env` is empty, the NAS panel renders an "offline / cors" hint and falls
back to placeholder values — the rest of the page still works.

## Production deploy

`npm run build` produces a static `dist/` directory with five HTML entries.
Serve it from any static host (nginx, Caddy, GitHub Pages, S3 + CloudFront).

The static host **must** also reverse-proxy `/api/truenas/*` to your TrueNAS
host with the Bearer token injected, mirroring the dev setup. Example nginx:

```nginx
location /api/truenas/ {
  proxy_pass https://truenas.local/;
  proxy_set_header Authorization "Bearer YOUR_KEY";
}
```

## Other services (Pi-hole, Plex, Speedtest, *arr)

The Network panel has placeholders for Pi-hole + Speedtest, and per-service
quick-app stats for Plex/Sonarr/Radarr. Those still hit the upstream services
directly from the browser; configure CORS on each or proxy them similarly.
Per-service URLs + tokens are read from `localStorage` keys in the
`arylmera.*` namespace (see `src/pages/home/Home.jsx` for the schema).

## Layout

```
.
├── index.html                  # Home page
├── nas.html plex.html …        # sibling page entries
├── vite.config.js              # multi-page input + /api/truenas proxy
└── src/
    ├── styles/                 # forge.css, space-bg.css, per-page CSS
    ├── lib/                    # icons, services, hooks, arylmera-menu
    └── pages/{home,nas,plex,homey,quicklinks}/main.jsx
```

## Out of scope

- TypeScript.
- Auth in front of the dashboard.
- Tests.
