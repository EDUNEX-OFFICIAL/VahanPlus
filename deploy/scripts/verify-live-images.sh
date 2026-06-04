#!/usr/bin/env bash
# Verify k3s VahanPlus deployments use the expected GHCR image tag.
#
# Usage:
#   ./deploy/scripts/verify-live-images.sh [expected-short-sha]
#   EXPECTED_IMAGE_TAG=2091fd0 ./deploy/scripts/verify-live-images.sh
#
# Exits 0 when web, api-express, and worker all use a tag matching expected
# (also accepts sha-<short> if that is what Helm set).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NAMESPACE="${NAMESPACE:-vahanplus}"
RELEASE="${RELEASE:-vahanplus}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

EXPECTED="${1:-${EXPECTED_IMAGE_TAG:-}}"
if [[ -z "$EXPECTED" ]]; then
  EXPECTED="$(git -C "$ROOT" rev-parse --short=7 HEAD 2>/dev/null || true)"
fi
if [[ -z "$EXPECTED" ]]; then
  echo "ERROR: pass expected short SHA or set EXPECTED_IMAGE_TAG" >&2
  exit 1
fi

normalize_tag() {
  local tag="$1"
  tag="${tag#vahanplus-api-express:}"
  tag="${tag#vahanplus-web:}"
  tag="${tag#vahanplus-worker:}"
  tag="${tag##*:}"
  tag="${tag#sha-}"
  echo "$tag"
}

matches_expected() {
  local tag
  tag="$(normalize_tag "$1")"
  [[ "$tag" == "$EXPECTED" ]] || [[ "$tag" == "latest" && -n "${ALLOW_LATEST:-}" ]]
}

deploy_name() {
  echo "${RELEASE}-vahanplus-${1}"
}

fail=0
for component in api-express web worker; do
  full="$(kubectl get deploy "$(deploy_name "$component")" -n "$NAMESPACE" \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)"
  if [[ -z "$full" ]]; then
    echo "FAIL: deployment $(deploy_name "$component") not found in ${NAMESPACE}" >&2
    fail=1
    continue
  fi
  tag="${full##*/}"
  if matches_expected "$tag"; then
    echo "OK  ${component}: ${full}"
  else
    echo "FAIL ${component}: ${full} (expected tag ${EXPECTED} or sha-${EXPECTED})" >&2
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "" >&2
  echo "Hint: gh run list --repo EDUNEX-OFFICIAL/VahanPlus --workflow=docker-publish.yml --limit 1" >&2
  exit 1
fi

echo ""
echo "All VahanPlus deployments match image tag ${EXPECTED}."
