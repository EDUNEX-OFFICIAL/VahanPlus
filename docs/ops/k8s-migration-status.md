# Kubernetes migration status

Last verified: code + Docker builds on dev machine. Cluster cutover is operator-owned.

## Repo artifacts (complete)

| Item | Status |
|------|--------|
| Helm chart (`deploy/helm/vahan360`) | Done |
| Ingress `/api` rewrite + TLS | Done |
| Prisma migrate Job | Done |
| External secrets (`existingSecret` + script) | Done |
| Worker `/healthz` + probes | Done |
| ServiceMonitor (Prometheus Operator) | Done |
| PDB, resources, HPA, NetworkPolicy (optional) | Done |
| CI: lint, build, Helm template | Done |
| CI: `docker-publish` → GHCR (4 images) | Done |
| Cutover runbook | [`k8s-cutover.md`](k8s-cutover.md) |
| Argo CD prod + staging manifests | Done |

## Docker images (must pass before deploy)

| Image | Dockerfile |
|-------|------------|
| `vahan360-web` | `apps/web/Dockerfile` |
| `vahan360-api-express` | `apps/api-express/Dockerfile` |
| `vahan360-worker` | `apps/worker/Dockerfile` |
| `vahan360-api-nest` | `apps/api-nest/Dockerfile` |

## Not migrated to Kubernetes (by design)

- **Postgres / Redis** — external managed services (hybrid); use `secrets.databaseUrl` / `redisUrl`
- **Caddy** — replaced by Ingress
- **Docker Compose observability** (Prometheus/Grafana/Loki) — optional; use cloud monitoring or install stack separately
- **Playwright browsers in worker** — set `worker.browserPoolStub: true` unless custom image with Chromium

## Operator checklist (not done in repo)

- [ ] Set `NEXT_PUBLIC_API_URL` GitHub variable
- [ ] Push images to GHCR (`main` or tag `v*`)
- [ ] Update `values-prod.yaml` (`imageRegistry`, RDS/Redis hosts)
- [ ] `create-k8s-secrets.sh` on cluster
- [ ] `helm upgrade` staging → smoke tests → prod cutover
- [ ] DNS → Ingress LB; decommission Compose production stack
