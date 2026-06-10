#!/usr/bin/env bash
# Roll out pre-built GHCR images to k3s (Helm only — no docker build).
#
# Used by GitHub Actions after docker-publish, or manually on the VPS:
#   export IMAGE_TAG=abc1234   # short git SHA, or sha-abc1234 if built with metadata default prefix
#   ./deploy/scripts/rollout-ghcr.sh
#
# Options:
#   --web-only     Update only web image; keep current api-express + worker tags
#   --no-wait      Skip helm --wait
#   -h, --help
#
# Requires: deploy/env/hostinger.env (GHCR_ORG, VAHANPLUS_DOMAIN)
# Env: IMAGE_TAG (required), KUBECONFIG, NAMESPACE, RELEASE, ENV_FILE, BUILD_MODE

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/deploy/env/hostinger.env}"
NAMESPACE="${NAMESPACE:-vahanplus}"
RELEASE="${RELEASE:-vahanplus}"
VALUES_FILE="$ROOT/deploy/helm/vahanplus/values-hostinger-kvm4.yaml"
BUILD_MODE="${BUILD_MODE:-all}"
HELM_WAIT="${HELM_WAIT:-true}"

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-only) BUILD_MODE="web" ;;
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
: "${IMAGE_TAG:?IMAGE_TAG required (short git SHA, same as GHCR image tag)}"

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

REG="ghcr.io/${GHCR_ORG}"
GHCR_ORG_LC="${GHCR_ORG,,}"

resolve_ghcr_tag() {
  local short="$1"
  local probe="ghcr.io/${GHCR_ORG_LC}/vahanplus-api-express"
  local tag
  for tag in "$short" "sha-${short}" "latest"; do
    if docker manifest inspect "${probe}:${tag}" >/dev/null 2>&1; then
      echo "$tag"
      return 0
    fi
  done
  echo "latest"
}

TAG="$(resolve_ghcr_tag "${IMAGE_TAG}")"
if [[ "$TAG" != "${IMAGE_TAG}" ]]; then
  echo "==> Resolved IMAGE_TAG ${IMAGE_TAG} → ${TAG} on GHCR"
fi
REG="ghcr.io/${GHCR_ORG_LC}"

deploy_name() {
  echo "${RELEASE}-vahanplus-${1}"
}

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

API_IMAGE_SET="vahanplus-api-express:${TAG}"
WEB_IMAGE_SET="vahanplus-web:${TAG}"
WORKER_IMAGE_SET="vahanplus-worker:${TAG}"

if [[ "$BUILD_MODE" == "web" ]]; then
  API_IMAGE_SET="$(current_helm_image api-express)"
  WORKER_IMAGE_SET="$(current_helm_image worker)"
  if [[ -z "$API_IMAGE_SET" || -z "$WORKER_IMAGE_SET" ]]; then
    echo "ERROR: --web-only needs existing api-express and worker deployments in ${NAMESPACE}" >&2
    exit 1
  fi
  echo "==> Web-only rollout (tag ${TAG})"
  echo "    Keeping api-express: ${API_IMAGE_SET}"
  echo "    Keeping worker:      ${WORKER_IMAGE_SET}"
else
  echo "==> Full rollout (tag ${TAG})"
fi

echo "    Registry: ${REG}"
echo "    Release:  ${RELEASE} (namespace ${NAMESPACE})"

HELM_ARGS=(
  upgrade --install "$RELEASE" "$ROOT/deploy/helm/vahanplus"
  --namespace "$NAMESPACE"
  --create-namespace
  --reset-values
  -f "$VALUES_FILE"
  --set "global.imageRegistry=${REG}"
  --set "global.imagePullPolicy=Always"
  --set "apiExpress.image=${API_IMAGE_SET}"
  --set "web.image=${WEB_IMAGE_SET}"
  --set "worker.image=${WORKER_IMAGE_SET}"
  --set "ingress.host=${VAHANPLUS_DOMAIN}"
  --set "apiExpress.corsOrigins=https://${VAHANPLUS_DOMAIN}"
)

if [[ "$HELM_WAIT" == "true" ]]; then
  HELM_ARGS+=(--wait --timeout 15m)
fi

# Recover from a stuck release (e.g. CI cancelled mid-upgrade via concurrency).
unlock_stuck_helm_release() {
  local status
  status="$(helm status "$RELEASE" -n "$NAMESPACE" -o json 2>/dev/null \
    | python3 -c "import json,sys; print(json.load(sys.stdin).get('info',{}).get('status',''))" 2>/dev/null || true)"
  case "$status" in
    pending-upgrade | pending-install | pending-rollback)
      echo "==> Helm release stuck in ${status}; rolling back to last deployed revision"
      local rev
      rev="$(helm history "$RELEASE" -n "$NAMESPACE" -o json 2>/dev/null \
        | python3 -c "
import json, sys
revs = [r for r in json.load(sys.stdin) if r.get('status') == 'deployed']
print(revs[-1]['revision'] if revs else '')
" 2>/dev/null || true)"
      if [[ -z "$rev" ]]; then
        echo "ERROR: no deployed revision to roll back to for ${RELEASE} in ${NAMESPACE}" >&2
        exit 1
      fi
      local rollback_args=(rollback "$RELEASE" "$rev" -n "$NAMESPACE")
      if [[ "$HELM_WAIT" == "true" ]]; then
        rollback_args+=(--wait --timeout 5m)
      fi
      helm "${rollback_args[@]}"
      ;;
  esac
}

unlock_stuck_helm_release

echo "==> Helm upgrade"
helm "${HELM_ARGS[@]}"

echo "==> Restart app pods (pick up new images)"
kubectl rollout restart "deployment/$(deploy_name web)" -n "$NAMESPACE"
if [[ "$BUILD_MODE" != "web" ]]; then
  kubectl rollout restart "deployment/$(deploy_name api-express)" -n "$NAMESPACE"
  kubectl rollout restart "deployment/$(deploy_name worker)" -n "$NAMESPACE"
fi

echo ""
echo "==> Rollout complete (tag ${TAG})"
kubectl rollout status "deployment/$(deploy_name web)" -n "$NAMESPACE" --timeout=5m || true
kubectl get pods -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image,STATUS:.status.phase \
  | grep "^${RELEASE}-vahanplus" || kubectl get pods -n "$NAMESPACE"
echo ""
echo "  https://${VAHANPLUS_DOMAIN}/"
