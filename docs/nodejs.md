# Node.js 20

Runtime for build and the `vite preview` server. Container base is `node:20-alpine`.

## Rules

- **Pin to Node 20** (`engines.node: ">=18"` in package.json, but Docker uses 20). Don't rely on Node 22-only APIs.
- **Use `node:` prefix** for built-ins: `import { resolve } from 'node:path'`. Makes module origin explicit and future-proof.
- **`process.env` reads** should default sensibly: `process.env.PORT || 4173`. Crash early if a required secret is missing in production.
- **No global state** in `src/server/*`. Each request is independent. Connection objects (e.g. `better-sqlite3`) may be module-scoped singletons.
- **Don't block the event loop.** Heavy sync work (CPU loops, large JSON.parse) blocks every request. `better-sqlite3` is sync but fast — that's fine. Anything else, use async.
- **Streams over buffers** for large payloads.

## Native modules

- `better-sqlite3` is a native addon. Alpine needs `python3 make g++` at build time (already in [Dockerfile](../docker/Dockerfile)). Don't drop those lines.
- If adding another native module, expect to rebuild on each Node major version bump.

## Pitfalls

- `__dirname` / `__filename` don't exist in ESM. Use `import.meta.url` + `fileURLToPath` if needed. The Vite config uses Vite's own `__dirname` shim — that's a Vite-only thing, not Node behavior.
