# Kubernetes cutover runbook — VahanPlus

Big-bang migration from Docker Compose to Kubernetes (hybrid: apps on K8s, managed Postgres/Redis).

## Prerequisites

- Kubernetes cluster with NGINX Ingress Controller and cert-manager
- Managed PostgreSQL and Redis reachable from the cluster (private network)
- Container images published via `.github/workflows/docker-publish.yml`
- `helm` 3.x and `kubectl` configured

## 1. Pre-cutover (T-7 days)

### Build images

Push to `main` or tag `v*` to trigger GHCR publish. Set repository variable `NEXT_PUBLIC_API_URL` to `https://<your-domain>/api`.

### Create secrets (never commit values)

```bash
export DATABASE_URL='postgresql://user:pass@your-rds-host:5432/vahanplus'
export REDIS_URL='rediss://your-elasticache-host:6379'
export JWT_SECRET='your-production-secret'
./deploy/scripts/create-k8s-secrets.sh
```

### Staging validation

```bash
helm upgrade --install vahanplus deploy/helm/vahanplus \
  -n vahanplus-staging --create-namespace \
  -f deploy/helm/vahanplus/values-staging.yaml

./deploy/scripts/k8s-smoke-test.sh vahanplus vahanplus-staging
```

Checklist:

- [ ] `/health` and `/ready` on api-express
- [ ] Login + JWT via Ingress (or port-forward)
- [ ] Job enqueue → worker consumes → DB row written
- [ ] `/khanan/config` scraper toggles work
- [ ] Prometheus scrapes `/metrics` (enable `monitoring.serviceMonitor` if using Prometheus Operator)

## 2. Pre-cutover (T-1 day)

1. Stop new scrape fanouts from the operator UI
2. Drain BullMQ: wait for active jobs to complete (`redis-cli LLEN` on scrape queue)
3. Final Postgres dump from Docker Compose:

   ```bash
   pg_dump -h localhost -p 5434 -U vahanplus vahanplus > vahanplus-pre-cutover.sql
   ```

4. Lower DNS TTL to 300 seconds

## 3. Cutover window

1. Enable maintenance page (optional Ingress default backend)
2. Restore dump to managed Postgres:

   ```bash
   psql "$DATABASE_URL" < vahanplus-pre-cutover.sql
   ```

3. Deploy production Helm release (migrate Job runs automatically):

   ```bash
   helm upgrade --install vahanplus deploy/helm/vahanplus \
     -n vahanplus --create-namespace \
     -f deploy/helm/vahanplus/values-prod.yaml \
     --set global.imageRegistry=ghcr.io/YOUR_ORG
   ```

4. Verify migrate Job succeeded:

   ```bash
   kubectl get jobs -n vahanplus -l app.kubernetes.io/component=migrate
   kubectl logs -n vahanplus job/vahanplus-vahanplus-migrate
   ```

5. Run smoke tests:

   ```bash
   ./deploy/scripts/k8s-smoke-test.sh vahanplus vahanplus
   ```

6. Internal test via `/etc/hosts` pointing at Ingress LoadBalancer IP
7. Switch DNS `vahanplus.example.com` to Ingress LB
8. End-to-end: login → enqueue job → dashboard data
9. After 24h stable: `docker compose down` on old host

## 4. Rollback

1. Revert DNS to old Docker host (Caddy on port 80)
2. `helm rollback vahanplus <revision> -n vahanplus`
3. Restore Postgres from pre-cutover snapshot if needed

## 5. Post-cutover

- Enable ArgoCD sync from `deploy/argocd/application.yaml` (update `repoURL` first)
- Pin image tags to git SHA instead of `:latest`
- Scale worker only after verifying Khanan portal rate limits in `/khanan/config`
- Set `worker.replicaCount` in `values-prod.yaml` when ready

## Helm value reference (production)

| Setting | Purpose |
|---------|---------|
| `secrets.existingSecret` | Pre-created K8s Secret name |
| `postgresql.enabled: false` | Use external RDS / Cloud SQL |
| `redis.enabled: false` | Use external ElastiCache / Memorystore |
| `ingress.tls.enabled` | TLS via cert-manager secret |
| `monitoring.serviceMonitor.enabled` | Prometheus Operator scrape |
| `migrate.enabled` | Pre-install/upgrade Prisma migrate Job |
