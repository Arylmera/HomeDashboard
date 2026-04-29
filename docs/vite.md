# Vite 5

Build tool and dev server. Also serves as the **runtime** in production via `vite preview` (because the proxy/auth-injection logic in `vite.config.js` is what keeps secrets server-side).

## Rules

- **Public env vars must be prefixed `VITE_`.** Anything else is invisible to client code. Public vars are baked into the bundle at build time — never put a secret in a `VITE_*` variable.
- **Runtime secrets live in `process.env`** and are read inside `vite.config.js` proxy `headers` callbacks. The callback form `() => ({...})` is required so values resolve at request-time, not config-load time.
- **Multi-page setup**: every page is declared in `build.rollupOptions.input` and has its own `<page>.html` at repo root. Adding a page = add the HTML file + a `pages/<page>/main.jsx` + the input entry.
- **Proxies route `/api/<svc>/*`** to upstream services. Never call upstream URLs directly from the browser — always go through `/api/<svc>` so auth headers are injected server-side.
- **`changeOrigin: true`** is required for most upstreams (matches the `Host` header). `secure: false` is fine for self-signed self-hosted services.
- **Preview server** binds to `0.0.0.0:4173` in container. `allowedHosts: true` is set so reverse proxies don't 403.

## Adding a new upstream service

1. Add `VITE_<SVC>_URL` to `.env.example` (public — points at the host).
2. If auth needed, add the secret env var (e.g. `<SVC>_API_KEY`) — **no `VITE_` prefix**.
3. Add a `proxy({...})` block in `vite.config.js` with the right header shape (Bearer / X-Api-Key / Basic / cookie).
4. Add the URL build-arg in `Dockerfile` and `.gitlab-ci.yml`.
5. Document in [services.md](#) — service registry in `src/lib/services.js`.

## Pitfalls

- HMR doesn't reload `vite.config.js` proxy changes — restart `npm run dev`.
- `import.meta.env.VITE_*` is the **client-side** way to read public vars. In the config file itself, use `loadEnv()` (already wired).
