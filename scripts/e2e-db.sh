#!/usr/bin/env bash
# Recreate pikol_e2e from scratch: migrate, then seed. Run before the
# servers start, so no pooled connection holds the database open.
set -euo pipefail

BACKEND="$(cd "$(dirname "$0")/../../pikol-backend" && pwd)"
DB=pikol_e2e

docker compose -f "$BACKEND/docker-compose.yml" up -d --wait postgres >/dev/null
docker compose -f "$BACKEND/docker-compose.yml" exec -T postgres \
  psql -q -U pikol -d postgres \
  -c "DROP DATABASE IF EXISTS $DB WITH (FORCE)" -c "CREATE DATABASE $DB"

cd "$BACKEND"
export DATABASE_URL="postgresql+asyncpg://pikol:pikol@localhost:5433/$DB"
uv run alembic upgrade head >/dev/null
uv run python -m src.devtools.e2e_seed
