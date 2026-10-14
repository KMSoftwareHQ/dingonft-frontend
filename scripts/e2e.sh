#!/bin/sh
set -eu

compose_file=compose.e2e.yaml

cleanup() {
  if [ "${E2E_KEEP_STACK:-0}" != "1" ]; then
    docker compose -f "$compose_file" down --volumes --remove-orphans
  fi
}

trap cleanup EXIT INT TERM
docker compose -f "$compose_file" build
docker compose -f "$compose_file" up -d --wait link
docker compose -f "$compose_file" run --rm --no-deps e2e
