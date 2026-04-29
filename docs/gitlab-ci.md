# GitLab CI

Single-stage pipeline: build Docker image, push to GitLab Container Registry.

## Rules

- **Tags pushed every build**: `:<short-sha>`, `:<branch-slug>`. `:latest` only on the default branch.
- **Use `docker:27` + `docker:27-dind`** with `DOCKER_TLS_CERTDIR=/certs` (TLS between client and daemon). Don't downgrade to insecure DinD.
- **`DOCKER_BUILDKIT=1`** is required for the `# syntax=` directive in the Dockerfile.
- **Login via `$CI_REGISTRY_PASSWORD` from stdin** (`--password-stdin`). Never `echo … | docker login` with the password as an arg — it ends up in process listings.
- **Public `VITE_*_URL` vars** are GitLab CI/CD variables (Settings → CI/CD → Variables). Mark "Protected" if only the default branch should build with them.
- **Never put runtime secrets in CI variables** that get baked into the image. Runtime secrets live on the deploy host (`.env` next to compose).
- **Rules-based pipeline triggers**: builds run on every branch and tag. Don't add `only: main` — branch images are useful for review.

## Adding a new build-time var

1. Add to `.env.example`.
2. Add `--build-arg VITE_FOO=…` in `.gitlab-ci.yml`.
3. Add `ARG VITE_FOO` + `ENV VITE_FOO=$VITE_FOO` in `Dockerfile`.
4. Define the variable in GitLab Settings → CI/CD → Variables.

## Pitfalls

- DinD certs path mismatch is the most common breakage — keep `DOCKER_TLS_CERTDIR` set on **both** the job and the service.
- `docker push --all-tags $CI_REGISTRY_IMAGE` pushes every local tag for that image — fine here because we only `-t` the ones we want.
