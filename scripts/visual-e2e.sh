#!/usr/bin/env bash
set -euo pipefail

VISUAL_MONGODB_URI="${VISUAL_MONGODB_URI:-mongodb://127.0.0.1:27017/casesync-visual}"
VISUAL_SEED_NOW="${VISUAL_SEED_NOW:-2026-01-15T09:00:00.000Z}"

if [[ "${VISUAL_ALLOW_REMOTE:-}" != "1" && "${ALLOW_REMOTE_MONGO:-}" != "1" ]]; then
  case "$VISUAL_MONGODB_URI" in
    mongodb://127.0.0.1:* | mongodb://localhost:*) ;;
    *)
      echo "Refusing to reseed a non-local visual database: $VISUAL_MONGODB_URI" >&2
      echo "Set VISUAL_ALLOW_REMOTE=1 only for a dedicated, disposable visual database." >&2
      exit 1
      ;;
  esac
fi

# The shared Mongo guard only understands ALLOW_REMOTE_MONGO, so keep the legacy
# VISUAL_ALLOW_REMOTE opt-in equivalent for the Playwright webServer as well.
if [[ "${VISUAL_ALLOW_REMOTE:-}" == "1" ]]; then
  export ALLOW_REMOTE_MONGO=1
fi

# Seed and Playwright must resolve the same database. Playwright's config prefers
# TEST_MONGODB_URI when resolving automated targets.
export MONGODB_URI="$VISUAL_MONGODB_URI"
export TEST_MONGODB_URI="$VISUAL_MONGODB_URI"
export SEED_NOW="$VISUAL_SEED_NOW"
export SEED_RESET_CONFIRM=YES

bun run seed:reset
bun run seed:demo

if [[ "${1:-}" == "--update-snapshots" ]]; then
  bun run --filter @casesync/web test:e2e:update-snapshots
else
  bun run --filter @casesync/web test:e2e:visual
fi
