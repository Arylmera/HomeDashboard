# JavaScript (ESM)

Project uses native ES modules (`"type": "module"` in `package.json`). Target: Node 20+, modern browsers.

## Rules

- **ESM only.** Use `import` / `export`. No `require()`. Use `import { x } from 'node:path'` for built-ins (the `node:` prefix is required in ESM context for clarity).
- **File extensions in imports** are required for relative paths in Node ESM (`./prefs.js`, not `./prefs`). Vite is more lenient for browser code but stay consistent.
- **`const` by default**, `let` when reassignment is needed. Never `var`.
- **Strict equality** (`===` / `!==`). Use `==` only for `x == null` (matches both `null` and `undefined`).
- **Optional chaining + nullish coalescing**: `obj?.foo ?? fallback`. Don't chain `||` for defaults — it overrides `0`, `''`, `false`.
- **Async/await over `.then()`.** Wrap with `try/catch` at the boundary that can act on the error; don't swallow.
- **No top-level side-effects** in library modules (`src/lib/*`, `src/server/*`). Export functions; let the caller decide when to run them.
- **Avoid default exports** for utilities and components. Named exports rename safely and grep cleanly.
- **`Buffer` is Node-only.** Don't import it in client code. The proxy headers in `vite.config.js` are server-side, which is why `Buffer.from(...)` is safe there.
- **No `console.log` left in committed code** unless it is intentional server logging. Use `console.warn` / `console.error` for problems.

## Module layout

- `src/lib/*` — shared client utilities (pure JS, no React-only code unless `.jsx`).
- `src/pages/<page>/main.jsx` — Vite multi-page entrypoint (`createRoot` + render).
- `src/server/*` — Node-only code, runs inside Vite's dev/preview server.

## Pitfalls

- `process.env` is **not** available in the browser bundle. Public config goes through `import.meta.env.VITE_*` (see [vite.md](vite.md)). Secrets stay in `process.env` and are read in `vite.config.js` proxy handlers.
- Circular imports break ESM in subtle ways — keep `lib/` flat.
