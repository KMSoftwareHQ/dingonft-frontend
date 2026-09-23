#!/usr/bin/env bash
# Bring up the local dev environment (dingonft-provider stack + this repo's
# frontend container) and print a one-screen status. Safe to run repeatedly:
# anything already running is left alone. Starts are detached, so this returns
# in a few seconds even though compose can take minutes on this box's HDD-backed
# root filesystem; logs go to $LOG_DIR.
#
#   scripts/dev-up.sh           # check + start what's down
#   scripts/dev-up.sh --status  # check only, start nothing
#
# Also run by the Claude Code SessionStart hook in .claude/settings.local.json.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROVIDER_DIR="${PROVIDER_DIR:-$REPO/../dingonft-provider}"
LOG_DIR="${LOG_DIR:-${TMPDIR:-/tmp}/dingonft-dev}"
BASE="http://127.0.0.1:${FRONTEND_PORT:-3020}${BASE_PATH:-/testing-nft-platform}"
START=1
[[ "${1:-}" == "--status" ]] && START=0

d() { timeout 15 docker "$@" 2>/dev/null; }
running() { [[ "$(d inspect -f '{{.State.Running}}' "$1")" == "true" ]]; }
# A compose `up` from an earlier run that is still working (slow disk) —
# don't stack a second one on top of it; that is what wedged the container
# names last time.
in_flight() { pgrep -f "docker compose.*--project-directory $1 up" >/dev/null; }

start_bg() { # <name> <project dir>
  mkdir -p "$LOG_DIR"
  if in_flight "$2"; then echo "  $1: start already in progress (log: $LOG_DIR/$1.log)"; return; fi
  nohup timeout 900 docker compose --project-directory "$2" up -d </dev/null \
    >"$LOG_DIR/$1.log" 2>&1 &
  echo "  $1: starting in background (log: $LOG_DIR/$1.log)"
}

echo "dingonft dev environment:"

if ! d info >/dev/null; then
  echo "  docker: NOT reachable, nothing checked"; exit 0
fi

provider_up=1
for c in app minio postgres dingocoind; do
  running "dingonft-provider-$c-1" || provider_up=0
done
if (( provider_up )); then
  echo "  provider: running (API 127.0.0.1:8090, MinIO :9210)"
elif [[ ! -d "$PROVIDER_DIR" ]]; then
  echo "  provider: DOWN and $PROVIDER_DIR not found"
elif (( START )); then
  start_bg provider "$PROVIDER_DIR"
else
  echo "  provider: DOWN"
fi

if running dingonft-frontend-frontend-1; then
  code=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$BASE/" || true)
  echo "  frontend: running, $BASE/ -> HTTP ${code:-timeout} (000 = still compiling)"
elif (( START )) && (( provider_up )); then
  # The frontend joins the provider's network, so it can only start after it.
  start_bg frontend "$REPO"
elif (( START )); then
  echo "  frontend: DOWN; start it once the provider is up (re-run this script)"
else
  echo "  frontend: DOWN"
fi

echo "  edge: https://ccnodes.net${BASE_PATH:-/testing-nft-platform}/ (operator IP only)"
exit 0
