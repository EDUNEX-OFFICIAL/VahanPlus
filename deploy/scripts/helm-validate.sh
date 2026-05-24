#!/usr/bin/env bash
# Validate Helm chart renders for default, staging, and prod value overlays.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHART="$ROOT/deploy/helm/vahan360"

command -v helm >/dev/null 2>&1 || { echo "helm not found; install Helm 3.x"; exit 1; }

echo "==> helm lint"
helm lint "$CHART"

echo "==> template (default values)"
helm template vahan360 "$CHART" >/dev/null

echo "==> template (staging)"
helm template vahan360 "$CHART" -f "$CHART/values-staging.yaml" >/dev/null

echo "==> template (prod + external secret)"
helm template vahan360 "$CHART" \
  -f "$CHART/values-prod.yaml" \
  --set secrets.existingSecret=vahan360-app-secrets >/dev/null

echo "Helm validation passed"
