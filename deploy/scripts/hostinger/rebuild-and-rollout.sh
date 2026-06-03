#!/usr/bin/env bash
# Build api-express, web, worker on the VPS, push to GHCR, roll out via Helm.
#
# Prefer the wrapper (same behavior as --all):
#   ./deploy/scripts/redeploy-live.sh
#
# Usage (repo root):
#   export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
#   source deploy/env/hostinger.env
#   ./deploy/scripts/hostinger/rebuild-and-rollout.sh
#
# Optional: IMAGE_TAG=my-tag ./deploy/scripts/hostinger/rebuild-and-rollout.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/deploy/env/hostinger.env}"
NAMESPACE="${NAMESPACE:-vahanplus}"
RELEASE="${RELEASE:-vahanplus}"
VALUES_FILE="$ROOT/deploy/helm/vahanplus/values-hostinger-kvm4.yaml"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

: "${GHCR_ORG:?GHCR_ORG required}"
: "${VAHANPLUS_DOMAIN:?VAHANPLUS_DOMAIN required}"
: "${GHCR_USERNAME:?GHCR_USERNAME required}"
: "${GHCR_TOKEN:?GHCR_TOKEN required}"

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
REG="ghcr.io/${GHCR_ORG}"
API_URL="https://${VAHANPLUS_DOMAIN}/api"

echo "==> Image tag: ${TAG}"
echo "==> Registry: ${REG}"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

echo "==> Build api-express"
docker build -f apps/api-express/Dockerfile -t "${REG}/vahanplus-api-express:${TAG}" .

echo "==> Build web (NEXT_PUBLIC_API_URL=${API_URL})"
docker build -f apps/web/Dockerfile \
  --build-arg "NEXT_PUBLIC_API_URL=${API_URL}" \
  -t "${REG}/vahanplus-web:${TAG}" .

echo "==> Build worker"
docker build -f apps/worker/Dockerfile -t "${REG}/vahanplus-worker:${TAG}" .

echo "==> Push images"
docker push "${REG}/vahanplus-api-express:${TAG}"
docker push "${REG}/vahanplus-web:${TAG}"
docker push "${REG}/vahanplus-worker:${TAG}"

echo "==> Helm rollout"
helm upgrade --install "$RELEASE" "$ROOT/deploy/helm/vahanplus" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --reset-values \
  -f "$VALUES_FILE" \
  --set "global.imageRegistry=${REG}" \
  --set "global.imagePullPolicy=Always" \
  --set "apiExpress.image=vahanplus-api-express:${TAG}" \
  --set "web.image=vahanplus-web:${TAG}" \
  --set "worker.image=vahanplus-worker:${TAG}" \
  --set "ingress.host=${VAHANPLUS_DOMAIN}" \
  --set "apiExpress.corsOrigins=https://${VAHANPLUS_DOMAIN}" \
  --wait \
  --timeout 15m

echo ""
echo "Rollout complete: ${TAG}"
kubectl get pods -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image,STATUS:.status.phase
