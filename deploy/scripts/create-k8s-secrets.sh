#!/usr/bin/env bash
# Create production secrets out-of-band (never commit real values).
# Usage: DATABASE_URL=... REDIS_URL=... JWT_SECRET=... ./deploy/scripts/create-k8s-secrets.sh

set -euo pipefail

NAMESPACE="${NAMESPACE:-vahanplus}"
SECRET_NAME="${SECRET_NAME:-vahanplus-app-secrets}"

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${REDIS_URL:?REDIS_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --from-literal=databaseUrl="$DATABASE_URL" \
  --from-literal=redisUrl="$REDIS_URL" \
  --from-literal=jwtSecret="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret $SECRET_NAME applied in namespace $NAMESPACE"
