#!/usr/bin/env bash
# Runs the migration + security tests against a throwaway local Postgres with PostGIS.
# Needs: psql, and a server you can reach, e.g.
#   docker run --rm -d -p 54329:5432 -e POSTGRES_PASSWORD=postgres postgis/postgis:16-3.4
# Usage: PGHOST=localhost PGPORT=54329 PGUSER=postgres PGPASSWORD=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
psql -q -c "drop database if exists shuky_test" -c "create database shuky_test"
psql -q -d shuky_test -v ON_ERROR_STOP=1 -f tests/supabase_stub.sql
for f in migrations/*.sql; do psql -q -d shuky_test -v ON_ERROR_STOP=1 -f "$f"; done
out=$(psql -q -d shuky_test -f tests/rls_test.sql 2>&1)
echo "$out" | grep -E "PASS|FAIL|ERROR" | sed 's/^psql:[^ ]* NOTICE:  //'
if echo "$out" | grep -qE "FAIL|ERROR"; then exit 1; fi
