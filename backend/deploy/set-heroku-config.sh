#!/usr/bin/env bash
# One-time (or repeatable) sync of backend/.env values into Heroku config vars.
# Usage: ./deploy/set-heroku-config.sh <heroku-app-name>
# Run from the backend/ directory. Requires `heroku login` first.
#
# Uses the `heroku-config` plugin's `config:push` (reads a .env-formatted file directly)
# rather than looping `heroku config:set KEY=value` calls ourselves — on Windows/Git Bash,
# passing quoted or space-containing values (e.g. APP_NAME="NestJS API") as raw CLI
# arguments breaks heroku's .cmd shim's own argument reconstruction. config:push sidesteps
# this entirely by parsing the file itself.
set -euo pipefail

APP="${1:?Usage: set-heroku-config.sh <heroku-app-name>}"
ENV_FILE="$(dirname "$0")/../.env"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

if ! (heroku plugins || true) | grep -q heroku-config; then
  echo "Installing the heroku-config plugin (one-time)..."
  heroku plugins:install heroku-config < /dev/null
fi

# Deliberately excluded:
#   APP_PORT — must stay unset so app.config.ts falls back to Heroku's own PORT
#   DATABASE_HOST/PORT/USERNAME/PASSWORD/NAME/CA/KEY/CERT — local Postgres only, superseded by DATABASE_URL
#   NODE_ENV — set explicitly to "production" below instead of the .env's "development"
# NOTE: DATABASE_TYPE is NOT excluded, unlike the others — the app itself (database.config.ts)
# falls back fine without it when DATABASE_URL is set, but the TypeORM CLI's own
# src/database/data-source.ts reads process.env.DATABASE_TYPE directly with no such fallback,
# and the release-phase migration command needs it or it fails with "Wrong driver: undefined".
EXCLUDE_KEYS="APP_PORT|DATABASE_HOST|DATABASE_PORT|DATABASE_USERNAME|DATABASE_PASSWORD|DATABASE_NAME|DATABASE_CA|DATABASE_KEY|DATABASE_CERT|WORKER_HOST|NODE_ENV"

grep -vE "^($EXCLUDE_KEYS)=" "$ENV_FILE" | grep -vE '^#|^$' > "$TMP_FILE"
echo "NODE_ENV=production" >> "$TMP_FILE"

# This heroku CLI version exits 1 whenever it also prints its "update available" notice,
# even on an otherwise-successful command — don't let `set -e` treat that as a real failure.
heroku config:push -a "$APP" -f "$TMP_FILE" -o < /dev/null || true

echo "Done. Remember to also set FRONTEND_DOMAIN/BACKEND_DOMAIN to the real Heroku URLs once known, e.g.:"
echo "  heroku config:set -a $APP BACKEND_DOMAIN=\$(heroku apps:info -a $APP | grep -i 'web url' | awk '{print \$3}')"
