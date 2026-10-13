#!/bin/sh
# Generates throwaway dev secrets on first start. They are NOT the production
# secrets, so the dev platform address and asset addresses differ from production.
set -e
SETTINGS_DIR=/settings
if [ ! -f "$SETTINGS_DIR/private.DO_NOT_SHARE_THIS.json" ]; then
  echo "Generating dev secrets in $SETTINGS_DIR"
  node -e '
    const crypto = require("crypto");
    console.log(JSON.stringify({
      addressingSecret: crypto.randomBytes(64).toString("hex"),
      platformPrivateKey: crypto.randomBytes(32).toString("hex"),
    }, null, 2));
  ' > "$SETTINGS_DIR/private.DO_NOT_SHARE_THIS.json"
fi
exec node app "$SETTINGS_DIR"
