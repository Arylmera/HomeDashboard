# Vite 5

Build tool and dev server. Also serves as the **runtime** in production via `vite preview` (because the proxy/auth-injection logic in `vite.config.js` is what keeps secrets server-side).

## Rules

- **Public env vars must be prefixed `VITE_`.** Anything else is invisible to client code. Public vars are baked into the bundle at build time — never put a secret in a `VITE_*` variable.
- **Runtime secrets live in `process.env`** and are read inside `vite.config.js` proxy `headers` callbacks. The callback form `() => ({...})` is required so values resolve at request-time, not config-load time.
- **Multi-page setup**: each page has its own `<page>.html` at repo root (vite native MPA). Adding a page = create `pages/<page>/main.jsx` + `<page>.html` (copy an existing one, swap `<title>` and the entry script `src`) + add it to `build.rollupOptions.input` in `vite.config.js`. Do **not** introduce a templating plugin (`vite-plugin-html` and similar route all unknown URLs to the index page in dev when a single shared template is used — broken nav).
- **Proxies route `/api/<svc>/*`** to upstream services. Never call upstream URLs directly from the browser — always go through `/api/<svc>` so auth headers are injected server-side.
- **`changeOrigin: true`** is required for most upstreams (matches the `Host` header). `secure: false` is fine for self-signed self-hosted services.
- **Preview server** binds to `0.0.0.0:4173` in container. `allowedHosts: true` is set so reverse proxies don't 403.
- **`@vitejs/plugin-basic-ssl` is dev-only.** It crashes `vite preview` in the production container (writes to a non-writable cert path). Skipped automatically when `NODE_ENV=production` or `DEV_HTTPS=false`.

## Adding a new upstream service

1. Add `VITE_<SVC>_URL` to `.env.example` (public — points at the host).
2. If auth needed, add the secret env var (e.g. `<SVC>_API_KEY`) — **no `VITE_` prefix**.
3. Add a `proxy({...})` block in `vite.config.js` with the right header shape (Bearer / X-Api-Key / Basic / cookie).
4. Add the URL build-arg in `Dockerfile` and `.gitlab-ci.yml`.
5. Document in [services.md](#) — service registry in `src/lib/services.js`.

## Pitfalls

- HMR doesn't reload `vite.config.js` proxy changes — restart `npm run dev`.
- `import.meta.env.VITE_*` is the **client-side** way to read public vars. In the config file itself, use `loadEnv()` (already wired).
