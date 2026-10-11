#!/usr/bin/env bash
# Docker PostGIS에 마이그레이션을 적용하고 RLS/좌표/제약을 검증한다. 실패 시 exit 1.
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME=memo-map-pg-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=pw postgis/postgis:16-3.4 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
# 이미지 초기화 중에는 임시 서버가 한 번 떴다가 내려간다 → '접속 가능' 로그가 두 번째로 찍힌 뒤(실제 서버)에 시작한다.
for _ in $(seq 1 90); do
  [ "$(docker logs "$NAME" 2>&1 | grep -c 'database system is ready to accept connections')" -ge 2 ] && break
  sleep 2
done
docker exec "$NAME" pg_isready -U postgres >/dev/null
run() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -t < "$1"; }
run supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do run "$f"; done
out=$(run supabase/tests/rls_check.sql 2>&1) || { echo "$out"; echo "DB checks FAILED"; exit 1; }
echo "$out" | grep -v '^\s*$'
if echo "$out" | grep -qE '\| f$|FAIL|ERROR'; then echo "DB checks FAILED"; exit 1; fi
echo "DB checks passed"
