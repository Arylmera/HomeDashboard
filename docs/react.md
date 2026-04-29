# React 18

Used for all page UIs. Each page has its own root rendered from `src/pages/<page>/main.jsx`.

## Rules

- **Function components only.** No classes.
- **Hooks at top level**, never inside conditionals or loops. Stable rule order.
- **`useEffect` deps must be exhaustive.** If you genuinely want it to run once, put a comment explaining why and use `[]`.
- **Mount with `createRoot`** (React 18 API), not the legacy `ReactDOM.render`.
- **Keys on lists** must be stable IDs, not array indexes (unless the list is append-only and never reordered).
- **Lift state only when shared.** Local UI state (open/closed, hover) stays in the leaf component.
- **Side-effects belong in effects or event handlers**, never in render.
- **Memoize deliberately.** `useMemo` / `useCallback` only when there's a measured re-render or referential-identity issue. Premature memo costs more than it saves.
- **Don't fetch in render.** Use `useEffect` + an `AbortController` to cancel on unmount.

## Project conventions

- Page components live next to their entry: `src/pages/<page>/<Page>.jsx` + `main.jsx`.
- Shared hooks go in `src/lib/hooks.js`. Preference hook is `src/lib/usePrefs.js` (talks to the SQLite-backed `/__prefs` endpoint).
- Icons centralized in `src/lib/icons.jsx`.
- Service definitions (URLs, auth shape) in `src/lib/services.js`.

## Pitfalls

- **Strict mode double-invokes effects in dev.** Effects must be idempotent and cleanup must be correct. Don't disable strict mode to "fix" symptoms.
- **State updates are async.** Don't read `state` immediately after `setState` — use the value you computed or the updater form `setX(prev => ...)`.
- **Don't mutate state.** Always return a new object/array.
