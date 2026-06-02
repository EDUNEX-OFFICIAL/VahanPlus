#!/usr/bin/env bash
# Deploy VahanPlus on Hostinger KVM4 (k3s + host Postgres/Redis).
#
# Prerequisites: bootstrap-k3s.sh, GHCR images published, hostinger.env configured.
#
# Usage (from repo root on VPS):
#   export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
#   source deploy/env/hostinger.env   # or export vars manually
#   ./deploy/scripts/hostinger/deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/deploy/env/hostinger.env}"
NAMESPACE="${NAMESPACE:-vahanplus}"
RELEASE="${RELEASE:-vahanplus}"
VALUES_FILE="$ROOT/deploy/helm/vahanplus/values-hostinger-kvm4.yaml"
SKIP_SMOKE="${SKIP_SMOKE:-false}"
SKIP_METRICS="${SKIP_METRICS:-true}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

: "${GHCR_ORG:?GHCR_ORG is required (GitHub org/user for ghcr.io)}"
: "${VAHANPLUS_DOMAIN:?VAHANPLUS_DOMAIN is required (ingress host)}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${REDIS_URL:?REDIS_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

# When another app already runs Postgres/Redis on this VPS (shared container, separate DBs),
# set SKIP_INFRA=true and point DATABASE_URL / REDIS_URL at the existing host ports.
if [[ "${SKIP_INFRA:-false}" == "true" ]]; then
  echo "==> SKIP_INFRA=true — not starting docker-compose.infra.prod.yml"
  echo "    Using existing Postgres/Redis at DATABASE_URL / REDIS_URL"
else
  echo "==> Start Postgres + Redis (localhost only)"
  docker compose -f docker-compose.infra.prod.yml --env-file "$ENV_FILE" up -d
  docker compose -f docker-compose.infra.prod.yml ps

  echo "==> Wait for Postgres healthy"
  for i in $(seq 1 30); do
    if docker compose -f docker-compose.infra.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-vahanplus}" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  echo "==> GHCR pull secret"
  NAMESPACE="$NAMESPACE" "$ROOT/deploy/scripts/hostinger/create-ghcr-pull-secret.sh"
else
  echo "WARN: GHCR_USERNAME/GHCR_TOKEN not set — skip pull secret (OK if images are public)"
fi

echo "==> Kubernetes app secrets"
NAMESPACE="$NAMESPACE" \
  DATABASE_URL="$DATABASE_URL" \
  REDIS_URL="$REDIS_URL" \
  JWT_SECRET="$JWT_SECRET" \
  "$ROOT/deploy/scripts/create-k8s-secrets.sh"

echo "==> Helm upgrade"
helm upgrade --install "$RELEASE" "$ROOT/deploy/helm/vahanplus" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --reset-values \
  -f "$VALUES_FILE" \
  --set "global.imageRegistry=ghcr.io/${GHCR_ORG}" \
  --set "apiExpress.image=vahanplus-api-express:${IMAGE_TAG}" \
  --set "web.image=vahanplus-web:${IMAGE_TAG}" \
  --set "worker.image=vahanplus-worker:${IMAGE_TAG}" \
  --set "ingress.host=${VAHANPLUS_DOMAIN}" \
  --wait \
  --timeout 10m

if [[ "$SKIP_SMOKE" != "true" ]]; then
  echo "==> Smoke tests"
  SKIP_METRICS="$SKIP_METRICS" "$ROOT/deploy/scripts/k8s-smoke-test.sh" "$RELEASE" "$NAMESPACE"
fi

echo ""
echo "Deploy complete."
echo "  https://${VAHANPLUS_DOMAIN}/"
echo "  https://${VAHANPLUS_DOMAIN}/api/health"
echo "  kubectl get pods -n $NAMESPACE"
