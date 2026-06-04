#!/usr/bin/env bash
# Point GHCR :latest tags at an existing short-SHA image (no rebuild).
# Used after matrix build-and-push so :latest matches the commit SHA tag.
#
# Usage:
#   GHCR_ORG=edunex-official IMAGE_TAG=2091fd0 ./deploy/scripts/sync-ghcr-latest.sh
# Requires: docker with buildx, logged in to ghcr.io

set -euo pipefail

: "${GHCR_ORG:?GHCR_ORG required (e.g. edunex-official)}"
: "${IMAGE_TAG:?IMAGE_TAG required (7-char git SHA)}"

ORG="${GHCR_ORG,,}"
REG="ghcr.io/${ORG}"

for img in vahanplus-web vahanplus-api-express vahanplus-worker; do
  src="${REG}/${img}:${IMAGE_TAG}"
  if ! docker manifest inspect "$src" >/dev/null 2>&1; then
    alt="${REG}/${img}:sha-${IMAGE_TAG}"
    if docker manifest inspect "$alt" >/dev/null 2>&1; then
      src="$alt"
    else
      echo "ERROR: neither ${REG}/${img}:${IMAGE_TAG} nor sha-${IMAGE_TAG} on GHCR" >&2
      exit 1
    fi
  fi
  echo "==> ${img}:latest -> ${src##*/}"
  docker buildx imagetools create -t "${REG}/${img}:latest" "$src"
done

echo "==> GHCR :latest synced to ${IMAGE_TAG}"
