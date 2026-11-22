#!/usr/bin/env bash
# Runs the migrations + security tests against a throwaway local Postgres with PostGIS.
# Needs: psql, and a server you can reach, e.g.
#   docker run --rm -d -p 54329:5432 -e POSTGRES_PASSWORD=postgres postgis/postgis:16-3.4
# Usage: PGHOST=localhost PGPORT=54329 PGUSER=postgres PGPASSWORD=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
failed=0
for test in tests/*_test.sql; do
  echo "== $test"
  psql -q -c "drop database if exists shuky_test" -c "create database shuky_test" 2>/dev/null
  psql -q -d shuky_test -v ON_ERROR_STOP=1 -f tests/supabase_stub.sql
  for f in migrations/*.sql; do psql -q -d shuky_test -v ON_ERROR_STOP=1 -f "$f"; done
  out=$(psql -q -d shuky_test -f "$test" 2>&1 || true)
  echo "$out" | grep -E "PASS|FAIL|ERROR" | sed 's/^psql:[^ ]* NOTICE:  //'
  if echo "$out" | grep -qE "FAIL|ERROR"; then failed=1; fi
done
exit $failed
