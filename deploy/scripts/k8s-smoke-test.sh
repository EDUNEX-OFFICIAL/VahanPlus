#!/usr/bin/env bash
# Smoke tests for a VahanPlus Helm release (staging or prod).
# Usage: ./deploy/scripts/k8s-smoke-test.sh [release-name] [namespace]

set -euo pipefail

RELEASE="${1:-vahanplus}"
NAMESPACE="${2:-vahanplus}"
API_SVC="${RELEASE}-vahanplus-api-express"
WEB_SVC="${RELEASE}-vahanplus-web"

echo "==> Waiting for api-express deployment"
kubectl rollout status "deployment/${RELEASE}-vahanplus-api-express" -n "$NAMESPACE" --timeout=120s

echo "==> Waiting for web deployment"
kubectl rollout status "deployment/${RELEASE}-vahanplus-web" -n "$NAMESPACE" --timeout=120s

echo "==> Waiting for worker deployment"
kubectl rollout status "deployment/${RELEASE}-vahanplus-worker" -n "$NAMESPACE" --timeout=120s

echo "==> Port-forward api-express (background)"
kubectl port-forward -n "$NAMESPACE" "svc/${API_SVC}" 13001:3001 &
PF_PID=$!
trap 'kill $PF_PID 2>/dev/null || true' EXIT
sleep 2

echo "==> GET /health"
curl -sf "http://127.0.0.1:13001/health" | grep -q '"status":"ok"'

echo "==> GET /ready"
curl -sf "http://127.0.0.1:13001/ready" | grep -q '"ready":true'

if [[ "${SKIP_METRICS:-}" == "true" ]]; then
  echo "==> SKIP /metrics (SKIP_METRICS=true)"
else
  echo "==> GET /metrics (Prometheus)"
  curl -sf "http://127.0.0.1:13001/metrics" | head -1 | grep -qE '^(#|scrape_)'
fi

kill $PF_PID 2>/dev/null || true
trap - EXIT

echo "==> Port-forward worker health"
kubectl port-forward -n "$NAMESPACE" "deployment/${RELEASE}-vahanplus-worker" 18080:8080 &
WF_PID=$!
trap 'kill $WF_PID 2>/dev/null || true' EXIT
sleep 2

echo "==> GET worker /healthz"
curl -sf "http://127.0.0.1:18080/healthz" | grep -q '"status":"ok"'

kill $WF_PID 2>/dev/null || true
trap - EXIT

echo "==> Port-forward web"
kubectl port-forward -n "$NAMESPACE" "svc/${WEB_SVC}" 13000:3000 &
WEB_PID=$!
trap 'kill $WEB_PID 2>/dev/null || true' EXIT
sleep 2

echo "==> GET web /"
curl -sf "http://127.0.0.1:13000/" -o /dev/null

echo ""
echo "All smoke checks passed for release $RELEASE in namespace $NAMESPACE"
