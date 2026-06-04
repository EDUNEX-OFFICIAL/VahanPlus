# Docker Compose vs k3s (production)

## What serves https://exp.vahan360.info

| Layer                                                                      | Role                                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **k3s** (Helm release `vahanplus`, namespace `vahanplus`)                  | **Production** — images from `ghcr.io/edunex-official/vahanplus-*:<git-sha>`               |
| **[`docker-compose.yml`](../../docker-compose.yml)**                       | **Local dev only** — builds from source, not GHCR                                          |
| **[`docker-compose.infra.prod.yml`](../../docker-compose.infra.prod.yml)** | Host **Postgres + Redis** (ports `5434`, `6379`) — shared with k3s via `host.k3s.internal` |

If you see `vahanplus-api-express-1` in `docker ps` with an old local image ID, that is the **Compose dev API** on port **3001**. It is **not** the production deployment unless you deliberately route traffic there.

## Verify production images

```bash
./deploy/scripts/verify-live-images.sh "$(git rev-parse --short=7 HEAD)"
```

After CI deploy, compare to the green workflow commit SHA (first 7 characters).

## Stop local Compose apps (keep Postgres/Redis for k3s)

When production runs in k3s and you do not need local dev API/worker/web:

```bash
cd /opt/vahanplus
docker compose stop api-express worker web
# Optional: remove containers (keeps volumes)
# docker compose rm -f api-express worker web
```

Do **not** `docker compose down` on the full stack if k3s still uses host Postgres/Redis.

To start dev stack again:

```bash
docker compose up -d postgres redis api-express worker web
```

## Related

- [ci-deploy-setup.md](ci-deploy-setup.md) — push-to-live pipeline
- [hostinger-kvm4-deploy.md](hostinger-kvm4-deploy.md) — VPS bootstrap
