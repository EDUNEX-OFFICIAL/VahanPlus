#!/usr/bin/env bash
# Build Docker images on this VPS, push to GHCR, and roll out to k3s (Helm).
# Prefer: git push main → GitHub Actions (see docs/ops/ci-deploy-setup.md).
#
# Run from repo root on the Hostinger / k3s server:
#   ./deploy/scripts/redeploy-live.sh
#
# Options:
#   --web-only     Rebuild & roll out only the Next.js web image (UI changes)
#   --all          Rebuild api-express, web, and worker (default)
#   --tag <name>   Image tag (default: current git short SHA)
#   --no-wait      Skip helm --wait (faster; you check pods yourself)
#   -h, --help
#
# Requires: deploy/env/hostinger.env (see deploy/env/hostinger.env.example)
# Env overrides: KUBECONFIG, NAMESPACE, RELEASE, ENV_FILE

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/deploy/env/hostinger.env}"
NAMESPACE="${NAMESPACE:-vahanplus}"
RELEASE="${RELEASE:-vahanplus}"
VALUES_FILE="$ROOT/deploy/helm/vahanplus/values-hostinger-kvm4.yaml"
BUILD_MODE="all"
IMAGE_TAG=""
HELM_WAIT="true"

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-only) BUILD_MODE="web" ;;
    --all) BUILD_MODE="all" ;;
    --tag)
      shift
      IMAGE_TAG="${1:?--tag requires a value}"
      ;;
    --no-wait) HELM_WAIT="false" ;;
    -h | --help) usage 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage 1
      ;;
  esac
  shift
done

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

: "${GHCR_ORG:?GHCR_ORG required — set in $ENV_FILE}"
: "${VAHANPLUS_DOMAIN:?VAHANPLUS_DOMAIN required — set in $ENV_FILE}"
: "${GHCR_USERNAME:?GHCR_USERNAME required — set in $ENV_FILE}"
: "${GHCR_TOKEN:?GHCR_TOKEN required — set in $ENV_FILE}"

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
REG="ghcr.io/${GHCR_ORG}"
API_URL="https://${VAHANPLUS_DOMAIN}/api"

deploy_name() {
  echo "${RELEASE}-vahanplus-${1}"
}

# Returns helm image ref: vahanplus-web:tag (no registry prefix)
current_helm_image() {
  local component="$1"
  local full
  full="$(kubectl get deploy "$(deploy_name "$component")" -n "$NAMESPACE" \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)"
  if [[ -z "$full" ]]; then
    echo ""
    return
  fi
  if [[ "$full" == *"/"* ]]; then
    echo "${full##*/}"
  else
    echo "$full"
  fi
}

echo "==> VahanPlus live redeploy"
echo "    Mode:     ${BUILD_MODE}"
echo "    Tag:      ${TAG}"
echo "    Registry: ${REG}"
echo "    Release:  ${RELEASE} (namespace ${NAMESPACE})"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

API_IMAGE_SET=""
WEB_IMAGE_SET=""
WORKER_IMAGE_SET=""

if [[ "$BUILD_MODE" == "all" ]]; then
  echo "==> Build api-express"
  docker build -f apps/api-express/Dockerfile -t "${REG}/vahanplus-api-express:${TAG}" .
  API_IMAGE_SET="vahanplus-api-express:${TAG}"

  echo "==> Build web (NEXT_PUBLIC_API_URL=${API_URL})"
  docker build -f apps/web/Dockerfile \
    --build-arg "NEXT_PUBLIC_API_URL=${API_URL}" \
    -t "${REG}/vahanplus-web:${TAG}" .
  WEB_IMAGE_SET="vahanplus-web:${TAG}"

  echo "==> Build worker"
  docker build -f apps/worker/Dockerfile -t "${REG}/vahanplus-worker:${TAG}" .
  WORKER_IMAGE_SET="vahanplus-worker:${TAG}"

  echo "==> Push images"
  docker push "${REG}/vahanplus-api-express:${TAG}"
  docker push "${REG}/vahanplus-web:${TAG}"
  docker push "${REG}/vahanplus-worker:${TAG}"
else
  echo "==> Build web only (NEXT_PUBLIC_API_URL=${API_URL})"
  docker build -f apps/web/Dockerfile \
    --build-arg "NEXT_PUBLIC_API_URL=${API_URL}" \
    -t "${REG}/vahanplus-web:${TAG}" .
  docker push "${REG}/vahanplus-web:${TAG}"
  WEB_IMAGE_SET="vahanplus-web:${TAG}"

  API_IMAGE_SET="$(current_helm_image api-express)"
  WORKER_IMAGE_SET="$(current_helm_image worker)"
  if [[ -z "$API_IMAGE_SET" || -z "$WORKER_IMAGE_SET" ]]; then
    echo "ERROR: --web-only needs existing api-express and worker deployments in ${NAMESPACE}" >&2
    exit 1
  fi
  echo "==> Keeping api-express image: ${API_IMAGE_SET}"
  echo "==> Keeping worker image:     ${WORKER_IMAGE_SET}"
fi

export IMAGE_TAG="$TAG"
export BUILD_MODE
export HELM_WAIT
chmod +x "$ROOT/deploy/scripts/rollout-ghcr.sh"
"$ROOT/deploy/scripts/rollout-ghcr.sh" $([[ "$BUILD_MODE" == "web" ]] && echo --web-only) $([[ "$HELM_WAIT" == "false" ]] && echo --no-wait)
echo "  https://${VAHANPLUS_DOMAIN}/khanan/config"
