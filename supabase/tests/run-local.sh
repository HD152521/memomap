#!/usr/bin/env bash
# Docker PostGIS에 마이그레이션을 적용하고 RLS/좌표/제약을 검증한다. 실패 시 exit 1.
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME=memo-map-pg-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=pw postgis/postgis:16-3.4 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 2; done
sleep 3
run() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -t < "$1"; }
run supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do run "$f"; done
out=$(run supabase/tests/rls_check.sql 2>&1) || { echo "$out"; echo "DB checks FAILED"; exit 1; }
echo "$out" | grep -v '^\s*$'
if echo "$out" | grep -qE '\| f$|FAIL|ERROR'; then echo "DB checks FAILED"; exit 1; fi
echo "DB checks passed"
