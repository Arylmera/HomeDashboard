# GitHub Actions

Single-job workflow: build Docker image, push to GitHub Container Registry (GHCR).

Workflow file: [.github/workflows/build.yml](../.github/workflows/build.yml).

## Rules

- **Tags pushed every build**: `:<short-sha>`, `:<branch-slug>`. `:latest` only on the default branch. Tags also get `:<tag>`.
- **Image name** is computed at runtime as `ghcr.io/${owner-lowercased}/homedashboard`. GHCR rejects mixed-case paths.
- **Auth uses `GITHUB_TOKEN`** (built-in). The job needs `permissions: packages: write`.
- **`DOCKER_BUILDKIT`** is implicit via `docker/build-push-action@v6` — required for the `# syntax=` directive in the Dockerfile.
- **Public `VITE_*_URL` vars** are repo Actions secrets (Settings → Secrets and variables → Actions). Use environments + required reviewers if you want to gate them per branch.
- **Never put runtime secrets in Actions secrets** that get baked into the image. Runtime secrets live on the deploy host (`.env` next to compose).
- **Build cache**: uses GitHub Actions cache (`type=gha`) for layer reuse across runs. Free, no extra setup.

## Adding a new build-time var

1. Add to `.env.example`.
2. Add `ARG VITE_FOO` + `ENV VITE_FOO=$VITE_FOO` in `Dockerfile`.
3. Add `VITE_FOO=${{ secrets.VITE_FOO }}` line under `build-args:` in the workflow.
4. Add the secret in GitHub Settings → Secrets and variables → Actions.

## Auto-deploy to Arcane

The `deploy` job runs after a successful `build` on the default branch only. It POSTs to an Arcane inbound webhook that pulls the new image and redeploys the project.

Required repo secret:

| Secret | Value |
|--------|-------|
| `ARCANE_WEBHOOK_URL` | full webhook URL, e.g. `https://arcane.example.com/api/webhooks/trigger/arc_wh_xxxxxxxx`. Create in Arcane → Settings → Webhooks (target: redeploy this project). Token is shown once at creation; it IS the credential, so treat the whole URL as a secret. |

The Arcane instance must be reachable from GitHub-hosted runners (public DNS + TLS, or use a self-hosted runner on the LAN).

## Pulling the image

The published package is **private by default**. To pull:

- **From a host (NAS, dev machine)**: `docker login ghcr.io` with username = GitHub user, password = a PAT with `read:packages`.
- **To make it public**: GitHub → your profile → Packages → `homedashboard` → Package settings → Change visibility → Public. Then anyone can `docker pull` with no auth.

## Pitfalls

- First push to a new repo creates the package as private and *unlinked* from the repo. Link it: package settings → "Manage Actions access" → add the repo with `Write` role, otherwise subsequent CI runs may not have permission to push.
- `${GITHUB_REPOSITORY_OWNER,,}` (lowercase expansion) is bash-only — runs because steps default to `bash` on `ubuntu-latest`. Don't switch the shell to `sh` or it breaks.
- `cache-to: type=gha,mode=max` can grow to ~10GB; GitHub auto-evicts old entries, no action needed.
