#!/usr/bin/env bash
# Check the root Compose development stack and print a one-screen status.
# Safe to run repeatedly: services that are already running are left alone.
# Starts are detached, so this returns in a few seconds even though building
# images and syncing dingocoind can take much longer; logs go to $LOG_DIR.
#
#   scripts/dev-up.sh           # check + start the stack if anything is down
#   scripts/dev-up.sh --status  # check only, start nothing
#
# The Claude Code SessionStart hook in .claude/settings.local.json runs this
# with --status.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${LOG_DIR:-${TMPDIR:-/tmp}/dingonft-dev}"
[[ -f "$REPO/.env" ]] && set -a && . "$REPO/.env" && set +a
BASE="http://127.0.0.1:${FRONTEND_PORT:-3020}${BASE_PATH:-/testing-nft-platform}"
SERVICES=(frontend link provider dingocoind postgres minio)
START=1
[[ "${1:-}" == "--status" ]] && START=0

dc() { timeout 15 docker compose --project-directory "$REPO" "$@" 2>/dev/null; }
# A compose `up` from an earlier run that is still working; don't stack a
# second one on top of it.
in_flight() { pgrep -f "docker compose --project-directory $REPO up" >/dev/null; }

echo "dingonft dev environment:"

if ! timeout 15 docker info >/dev/null 2>&1; then
  echo "  docker: NOT reachable, nothing checked"; exit 0
fi

down=()
for s in "${SERVICES[@]}"; do
  state=$(dc ps -a --format '{{.State}} {{.Health}}' "$s" | head -n1)
  echo "  $s: ${state:-not created}"
  [[ "$state" == running* ]] || down+=("$s")
done

if (( ${#down[@]} == 0 )); then
  code=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$BASE/" || true)
  echo "  site: $BASE/ -> HTTP ${code:-timeout}"
elif in_flight; then
  echo "  start already in progress (log: $LOG_DIR/compose.log)"
elif (( START )); then
  mkdir -p "$LOG_DIR"
  nohup timeout 1800 docker compose --project-directory "$REPO" up -d --build \
    </dev/null >"$LOG_DIR/compose.log" 2>&1 &
  echo "  starting in background (log: $LOG_DIR/compose.log)"
else
  echo "  down: ${down[*]} (start with scripts/dev-up.sh or docker compose up -d --build)"
fi

echo "  edge: https://ccnodes.net${BASE_PATH:-/testing-nft-platform}/ (operator IP only)"
exit 0
