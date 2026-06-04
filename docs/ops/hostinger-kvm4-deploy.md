# Hostinger KVM4 production deploy

Single VPS (4 vCPU, 16 GB RAM): **k3s** for apps, **Docker Compose** for Postgres + Redis on the host.

| Component                | Where                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| web, api-express, worker | k3s pods (Helm)                                                    |
| Postgres, Redis          | `docker-compose.infra.prod.yml` on host (`127.0.0.1:5434`, `6379`) |
| Ingress + TLS            | ingress-nginx + cert-manager (Let's Encrypt)                       |

Do **not** use [`values-prod.yaml`](../../deploy/helm/vahanplus/values-prod.yaml) on KVM4 (it assumes AWS RDS and 2+ replicas). Use [`values-hostinger-kvm4.yaml`](../../deploy/helm/vahanplus/values-hostinger-kvm4.yaml).

## Prerequisites

1. Hostinger **KVM4** with **Ubuntu 24.04 LTS**
2. Domain DNS **A record** → VPS public IPv4
3. GitHub repo with images published to GHCR ([`docker-publish.yml`](../../.github/workflows/docker-publish.yml))
4. GitHub repo variable: `NEXT_PUBLIC_API_URL=https://<your-domain>/api` (set **before** building the web image)
5. GHCR PAT with `read:packages` for the VPS

## 1. Publish images (from your dev machine / CI)

Push to `main` or tag `v*` so GHCR receives:

- `ghcr.io/<org>/vahanplus-web`
- `ghcr.io/<org>/vahanplus-api-express`
- `ghcr.io/<org>/vahanplus-worker`

## 2. VPS one-time bootstrap

SSH into the VPS as a sudo user:

```bash
git clone <your-repo-url> /opt/vahanplus
cd /opt/vahanplus

export LETSENCRYPT_EMAIL=admin@yourdomain.com
sudo ./deploy/scripts/hostinger/bootstrap-k3s.sh
```

Also open ports **80** and **443** in Hostinger hPanel firewall. Optionally enable UFW after confirming SSH:

```bash
sudo ufw enable
```

## 3. Configure secrets (on VPS)

```bash
cp deploy/env/hostinger.env.example deploy/env/hostinger.env
nano deploy/env/hostinger.env
```

Set strong `POSTGRES_PASSWORD`, `JWT_SECRET`, `GHCR_ORG`, `VAHANPLUS_DOMAIN`, `GHCR_USERNAME`, `GHCR_TOKEN`, and matching `DATABASE_URL` / `REDIS_URL` (use `host.k3s.internal` as in the example).

Never commit `deploy/env/hostinger.env`.

### Shared Postgres / Redis (multiple apps on one VPS)

If **another app already uses the same Postgres container** (separate database) or Redis:

1. Set `SKIP_INFRA=true` in `hostinger.env` — **do not** run `docker-compose.infra.prod.yml` (avoids port `5434`/`6379` conflict and a second Postgres).
2. `DATABASE_URL` must use **VahanPlus DB only** (e.g. database `vahan360` or `vahanplus`) — **never** `gdms` or the other app’s DB name.
3. Use the **same** `POSTGRES_USER` / password as the running Postgres container (copy from Hostinger Docker env — do not rotate unless you update every app).
4. `REDIS_URL`: if Redis is shared, use a different logical DB: `redis://host.k3s.internal:6379/1` (automation often uses `/0`).
5. Do **not** `docker compose down` on the shared stack or delete the Postgres volume.
6. k3s uses **80/443** for `exp.vahan360.info`; ensure that does not clash with another app’s Caddy on 80/443 (stop duplicate edge proxy or use one reverse proxy).

Verify databases on the server:

```bash
docker exec <postgres-container-name> psql -U <user> -c '\l'
```

## 4. Deploy

```bash
cd /opt/vahanplus
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
# Shared Postgres/Redis already running:
# export SKIP_INFRA=true
./deploy/scripts/hostinger/deploy.sh
```

This will:

1. Start Postgres + Redis (localhost-bound)
2. Create K8s secrets + GHCR pull secret
3. `helm upgrade` with Hostinger values (migrate Job runs on upgrade)
4. Run smoke tests (`SKIP_METRICS=true` by default)

## 5. Verify

```bash
kubectl get pods -n vahanplus
curl -sf https://<your-domain>/api/health
```

Browser: `https://<your-domain>/` — login, enqueue a scrape job, check `/khanan/config`.

TLS certificate: `kubectl describe certificate -n vahanplus` (cert-manager).

## Database migration from dev

**Option A — empty DB:** migrate Job on `helm upgrade` applies Prisma migrations.

**Option B — copy existing data:**

```bash
# On dev machine
pg_dump -h localhost -p 5434 -U vahanplus vahanplus > vahanplus.sql

# On VPS (after infra compose is up)
docker compose -f docker-compose.infra.prod.yml --env-file deploy/env/hostinger.env exec -T postgres \
  psql -U vahanplus vahanplus < vahanplus.sql
```

Then run `./deploy/scripts/hostinger/deploy.sh` (migrate Job is idempotent for already-applied migrations).

## Updates (new release)

**Recommended (fast):** push to `main` — GitHub Actions builds images and runs `deploy/scripts/rollout-ghcr.sh` on this VPS. One-time setup: [`ci-deploy-setup.md`](ci-deploy-setup.md).

**Emergency / CI down (slow — builds on VPS):**

```bash
cd /opt/vahanplus
./deploy/scripts/redeploy-live.sh          # full
./deploy/scripts/redeploy-live.sh --web-only
```

**Manual rollout** (images already on GHCR from CI):

```bash
export IMAGE_TAG=<short-git-sha>
./deploy/scripts/rollout-ghcr.sh
```

Equivalent legacy script: `./deploy/scripts/hostinger/rebuild-and-rollout.sh`

**First-time or secrets/infra change** — use full deploy (does not rebuild images on VPS):

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
./deploy/scripts/hostinger/deploy.sh
```

Production rollouts pin **git SHA tags** (not `:latest`). Verify with `./deploy/scripts/verify-live-images.sh <sha>`.

## Rollback

```bash
helm rollback vahanplus -n vahanplus
```

Revert DNS if you changed it during a failed cutover.

## Resource notes (16 GB)

- All app replicas = **1**; HPA off
- `worker.browserPoolStub: true` until a Playwright worker image is built for Linux
- Monitor: `kubectl top pods -n vahanplus`

## Docker Compose on the same VPS

k3s serves production traffic. [`docker-compose.yml`](../../docker-compose.yml) is for **local dev** (API on port 3001). Do not confuse `vahanplus-api-express-1` in `docker ps` with k3s pods. See [docker-compose-vs-k3s.md](docker-compose-vs-k3s.md).

## Related docs

- Generic K8s cutover: [`k8s-cutover.md`](k8s-cutover.md)
- Migration status: [`k8s-migration-status.md`](k8s-migration-status.md)
