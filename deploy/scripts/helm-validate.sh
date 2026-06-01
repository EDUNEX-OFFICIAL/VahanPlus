#!/usr/bin/env bash
# Validate Helm chart renders for default, staging, and prod value overlays.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHART="$ROOT/deploy/helm/vahanplus"

command -v helm >/dev/null 2>&1 || { echo "helm not found; install Helm 3.x"; exit 1; }

echo "==> helm lint"
helm lint "$CHART"

echo "==> template (default values)"
helm template vahanplus "$CHART" >/dev/null

echo "==> template (staging)"
helm template vahanplus "$CHART" -f "$CHART/values-staging.yaml" >/dev/null

echo "==> template (prod + external secret)"
helm template vahanplus "$CHART" \
  -f "$CHART/values-prod.yaml" \
  --set secrets.existingSecret=vahanplus-app-secrets >/dev/null

echo "==> template (hostinger kvm4)"
helm template vahanplus "$CHART" \
  -f "$CHART/values-hostinger-kvm4.yaml" \
  --set secrets.existingSecret=vahanplus-app-secrets \
  --set global.imageRegistry=ghcr.io/example \
  --set ingress.host=vahanplus.example.com >/dev/null

echo "Helm validation passed"
