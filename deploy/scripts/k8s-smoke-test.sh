#!/usr/bin/env bash
# Smoke tests for a Vahan360 Helm release (staging or prod).
# Usage: ./deploy/scripts/k8s-smoke-test.sh [release-name] [namespace]

set -euo pipefail

RELEASE="${1:-vahan360}"
NAMESPACE="${2:-vahan360}"
API_SVC="${RELEASE}-vahan360-api-express"
WEB_SVC="${RELEASE}-vahan360-web"

echo "==> Waiting for api-express deployment"
kubectl rollout status "deployment/${RELEASE}-vahan360-api-express" -n "$NAMESPACE" --timeout=120s

echo "==> Waiting for web deployment"
kubectl rollout status "deployment/${RELEASE}-vahan360-web" -n "$NAMESPACE" --timeout=120s

echo "==> Waiting for worker deployment"
kubectl rollout status "deployment/${RELEASE}-vahan360-worker" -n "$NAMESPACE" --timeout=120s

echo "==> Port-forward api-express (background)"
kubectl port-forward -n "$NAMESPACE" "svc/${API_SVC}" 13001:3001 &
PF_PID=$!
trap 'kill $PF_PID 2>/dev/null || true' EXIT
sleep 2

echo "==> GET /health"
curl -sf "http://127.0.0.1:13001/health" | grep -q '"status":"ok"'

echo "==> GET /ready"
curl -sf "http://127.0.0.1:13001/ready" | grep -q '"ready":true'

echo "==> GET /metrics (Prometheus)"
curl -sf "http://127.0.0.1:13001/metrics" | head -1 | grep -qE '^(#|scrape_)'

kill $PF_PID 2>/dev/null || true
trap - EXIT

echo "==> Port-forward worker health"
kubectl port-forward -n "$NAMESPACE" "deployment/${RELEASE}-vahan360-worker" 18080:8080 &
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
