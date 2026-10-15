#!/bin/sh
# Writes the provider's private settings, then starts it.
#
# Production: ADDRESSING_SECRET and PLATFORM_PRIVATE_KEY come from the
# environment. With REQUIRE_SECRETS=1 the provider refuses to start without
# them: generated keys would derive different NFT addresses and sign with the
# wrong platform key against production storage.
#
# Development: throwaway secrets are generated on first start. They are NOT the
# production secrets, so dev platform and asset addresses differ.
set -e
SETTINGS_DIR=/settings
SETTINGS_FILE="$SETTINGS_DIR/private.DO_NOT_SHARE_THIS.json"
umask 077

if [ -n "${ADDRESSING_SECRET:-}" ] && [ -n "${PLATFORM_PRIVATE_KEY:-}" ]; then
  node -e '
    console.log(JSON.stringify({
      addressingSecret: process.env.ADDRESSING_SECRET,
      platformPrivateKey: process.env.PLATFORM_PRIVATE_KEY,
    }, null, 2));
  ' > "$SETTINGS_FILE"
elif [ "${REQUIRE_SECRETS:-0}" = "1" ]; then
  echo "ADDRESSING_SECRET and PLATFORM_PRIVATE_KEY are required (REQUIRE_SECRETS=1); refusing to start." >&2
  exit 1
elif [ ! -f "$SETTINGS_FILE" ]; then
  echo "Generating dev secrets in $SETTINGS_DIR"
  node -e '
    const crypto = require("crypto");
    console.log(JSON.stringify({
      addressingSecret: crypto.randomBytes(64).toString("hex"),
      platformPrivateKey: crypto.randomBytes(32).toString("hex"),
    }, null, 2));
  ' > "$SETTINGS_FILE"
fi
exec node app "$SETTINGS_DIR"
