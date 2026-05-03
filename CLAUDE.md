# HomeDashboard — project instructions

## Documentation-first

Before writing or modifying code, **consult `docs/`** for the relevant tech.
Each file encodes the project's rules, conventions, and pitfalls for one part
of the stack. Follow them.

| Touching…                              | Read first |
|----------------------------------------|------------|
| `.js` / `.jsx` syntax, modules, imports | [docs/javascript.md](docs/javascript.md) |
| Components, hooks, page entries         | [docs/react.md](docs/react.md) |
| `vite.config.js`, proxies, env vars     | [docs/vite.md](docs/vite.md) |
| Server code in `src/server/*`           | [docs/nodejs.md](docs/nodejs.md) |
| `prefs.js`, SQLite, `/data`             | [docs/better-sqlite3.md](docs/better-sqlite3.md) |
| Anything in `src/styles/`               | [docs/css.md](docs/css.md) |
| `docker/Dockerfile`                     | [docs/docker.md](docs/docker.md) |
| `.github/workflows/*.yml`               | [docs/github-actions.md](docs/github-actions.md) |
| `docker/docker-compose.example.yml`     | [docs/docker-compose.md](docs/docker-compose.md) |
| Branching, commits, history             | [docs/git.md](docs/git.md) |
| Any upstream HTTP API (`/api/<svc>` proxy or `useXxx` hook) | [docs/api/README.md](docs/api/README.md) |

Index and full stack overview: [docs/README.md](docs/README.md).

## Rules

- **Always check `docs/<tech>.md` before suggesting or writing code** for that tech.
  If the doc contradicts a habit, the doc wins.
- **If you find a new rule worth keeping** (user correction, gotcha, convention),
  update the relevant `docs/*.md` file rather than just remembering it.
- **If a new tech is introduced**, create `docs/<tech>.md` and add it to
  `docs/README.md` and the table above.
- **Secrets never go in `VITE_*` vars** or anywhere baked into the bundle. See
  [docs/vite.md](docs/vite.md) and [docs/docker.md](docs/docker.md).
