#!/usr/bin/env bash
# Create or update GHCR imagePullSecret for private packages.
# Usage:
#   GHCR_USERNAME=you GHCR_TOKEN=ghp_... ./deploy/scripts/hostinger/create-ghcr-pull-secret.sh
# Optional: NAMESPACE=vahanplus SECRET_NAME=ghcr-pull

set -euo pipefail

NAMESPACE="${NAMESPACE:-vahanplus}"
SECRET_NAME="${SECRET_NAME:-ghcr-pull}"

: "${GHCR_USERNAME:?GHCR_USERNAME is required}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required (PAT with read:packages)}"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --docker-server=ghcr.io \
  --docker-username="$GHCR_USERNAME" \
  --docker-password="$GHCR_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Image pull secret $SECRET_NAME applied in namespace $NAMESPACE"
