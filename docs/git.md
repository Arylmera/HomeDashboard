# Git

## Rules

- **`main` is protected** (deployed by CI). Don't force-push.
- **Feature branches** named `feat/<short>`, `fix/<short>`, `chore/<short>`. Slug becomes the branch image tag in the registry.
- **Conventional Commits** preferred: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `ci:`. Subject ≤ 72 chars, imperative.
- **Squash on merge** for feature branches — keeps `main` history linear.
- **Never commit secrets.** `.env`, `*.db`, `node_modules`, `dist/` belong in `.gitignore`. If you commit a secret by accident: rotate the secret first, then rewrite history.
- **Small, reviewable PRs.** A 30-line PR gets reviewed; a 3000-line PR gets rubber-stamped.
- **Atomic commits.** One logical change per commit. `git add -p` is your friend.

## .gitignore essentials

```
node_modules/
dist/
.env
.env.local
*.db
*.db-journal
*.db-wal
*.db-shm
```

## Pitfalls

- `git push --force` on `main` will retag `:latest` from a rewritten SHA — the registry will keep the orphaned image but deployments may break. Don't.
- Line endings on Windows: keep `core.autocrlf=input` or commit a `.gitattributes` enforcing LF for `.sh`, `.yml`, `Dockerfile`.
