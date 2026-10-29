#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  bun run seed:stress:reset
}
trap cleanup EXIT

bun run seed:stress
(cd apps/web && bunx playwright test --grep @performance)
