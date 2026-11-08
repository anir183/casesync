#!/usr/bin/env bash
set -euo pipefail

# Run one browser at a time, reseeding the demo database before each. A single
# Playwright invocation would run all three projects against one seed, and the
# mutation specs in the first project remove state that the next project's
# fixtures expect.
for project in chromium firefox webkit; do
  echo "=== ${project} ==="
  bun run seed:demo
  (
    cd apps/web
    PLAYWRIGHT_ALL_BROWSERS=1 bunx playwright test \
      --project="${project}-desktop" \
      --grep-invert "@performance|@visual"
  )
done
