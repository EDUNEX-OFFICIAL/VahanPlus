# Vahan360

pnpm + Turborepo monorepo for vehicle / Khanan ingest and control plane.

## Architecture

```
Next dashboard → Express control plane → BullMQ → Playwright worker → Postgres
                                                      ↓
                                              NestJS v2 (optional reads)
```

| Layer | App | Stack |
|-------|-----|-------|
| UI | `apps/web` | Next.js 15+, React 19, Tailwind CSS 4, TanStack Query |
| Primary API | `apps/api-express` | Express 4, JWT, BullMQ producer |
| Alt API | `apps/api-nest` | NestJS 11, health + read endpoints |
| Worker | `apps/worker` | BullMQ + Playwright (stub mode default) |
| Packages | `packages/*` | contracts, db (Prisma 6), scraper-core, scraper-bihar-epass, epass-orchestrator, browser-pool |

## Bihar ePass scraping

Five-level pipeline (district → consigner → challan → pass → MCV vehicle status) via BullMQ worker. Tuning, fanout, and ops runbook:

**[docs/scraping/bihar-epass-pipeline.md](docs/scraping/bihar-epass-pipeline.md)**

Agent/build notes: [AGENTS.md](AGENTS.md)

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (optional, for Compose stack)
- Helm 3+ (for chart lint / deploy)

## Quick start (local)

```bash
cp .env.example .env
pnpm install
pnpm --filter @vahan360/contracts build
pnpm --filter @vahan360/db exec prisma generate
pnpm --filter @vahan360/db build
pnpm --filter @vahan360/scraper-core build
pnpm --filter @vahan360/browser-pool build

# Start Postgres + Redis (Docker)
docker compose up -d postgres redis

> **Note:** Postgres is mapped to host port **5434** (not 5432) to avoid conflicts with a local PostgreSQL install. Use `DATABASE_URL=...@127.0.0.1:5434/vahan360` in `.env`.

# Migrate and seed (loads DATABASE_URL from repo root .env)
pnpm db:deploy
pnpm db:seed

# Run apps (web + api-express + worker; packages pre-built via bootstrap)
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Login: `admin` / `admin123` (from seed)

Do **not** run `pnpm dev` and Kubernetes port-forward on the same ports at once. Use either local dev **or** K8s (see below).

### Local dev vs Kubernetes

| Mode | Command |
|------|---------|
| **Local** (hot reload) | `docker compose up -d postgres redis` then `pnpm dev` |
| **Kubernetes** (Docker Desktop) | `.\deploy\scripts\local-k8s-deploy.ps1` then port-forward (see [docs/ops/k8s-cutover.md](docs/ops/k8s-cutover.md)) |

Optional Nest API: `pnpm --filter @vahan360/api-nest dev` (not started by default `pnpm dev`).

## Docker Compose (full stack)

```bash
docker compose up -d
# UI via Caddy: http://localhost (proxies web + /api → express)
```

Optional Nest API profile:

```bash
docker compose --profile nest up -d api-nest
```

Observability profile (Prometheus, Grafana, Loki):

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml --profile observability up -d
```

## Stub scrape flow

```bash
# Login
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Enqueue job (use token from login)
curl -s -X POST http://localhost:3001/jobs/scrape \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"vehicle","target":"MH12AB1234"}'

# Check job status
curl -s http://localhost:3001/jobs/<JOB_ID> -H "Authorization: Bearer <TOKEN>"
```

Ensure `apps/worker` is running to process the queue.

## Design system

Dark-only dashboard tokens live in [`apps/web/src/styles/tokens.css`](apps/web/src/styles/tokens.css).

## Kubernetes (production)

Apps run on Kubernetes; **Docker Compose** is for local dev infra only (`postgres`, `redis`) or legacy full stack.

| Step | Command / doc |
|------|----------------|
| Build images (CI) | Push to `main` → [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) (GHCR) |
| Create secrets | [`deploy/scripts/create-k8s-secrets.sh`](deploy/scripts/create-k8s-secrets.sh) |
| Staging deploy | `helm upgrade --install vahan360 deploy/helm/vahan360 -n vahan360-staging -f deploy/helm/vahan360/values-staging.yaml` |
| Production deploy | `helm upgrade --install vahan360 deploy/helm/vahan360 -n vahan360 -f deploy/helm/vahan360/values-prod.yaml` |
| Cutover runbook | [`docs/ops/k8s-cutover.md`](docs/ops/k8s-cutover.md) |
| Smoke tests | [`deploy/scripts/k8s-smoke-test.sh`](deploy/scripts/k8s-smoke-test.sh) |

Set GitHub repo variable `NEXT_PUBLIC_API_URL` to `https://<your-domain>/api` before building the web image.

```bash
helm lint deploy/helm/vahan360
./deploy/scripts/helm-validate.sh
```

Argo CD: [`deploy/argocd/application.yaml`](deploy/argocd/application.yaml) (prod), [`deploy/argocd/application-staging.yaml`](deploy/argocd/application-staging.yaml) (staging).

## CI

GitHub Actions runs turbo lint/build, Prisma validate, api-express tests, Helm lint/template, and publishes container images on `main`.

## Playwright (non-stub worker)

```bash
pnpm --filter @vahan360/worker exec playwright install chromium
BROWSER_POOL_STUB=false pnpm --filter @vahan360/worker dev
```
