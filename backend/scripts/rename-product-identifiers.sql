-- P0-03 DB Migration — Run once before or during the first deploy after the P0 code lands.
-- Renames stale product identifiers in UserProductRole from the old marketing slugs
-- to the canonical suite names used by the code.
--
-- Safe to run multiple times (WHERE clause is a no-op if already renamed).
-- No schema change — plain UPDATE only. Can run without downtime.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/scripts/rename-product-identifiers.sql
--   -- OR via Docker:
--   docker compose -f docker-compose.prod.yml exec postgres \
--     psql -U craftsuite -d craftsuite -f /scripts/rename-product-identifiers.sql

BEGIN;

-- Step 1: lecturercraft → lecturesuite
UPDATE "UserProductRole"
SET product = 'lecturesuite'
WHERE product = 'lecturercraft';

-- Step 2: scholarcraft → scholarsuite
UPDATE "UserProductRole"
SET product = 'scholarsuite'
WHERE product = 'scholarcraft';

-- Verify — expect 0 rows
SELECT product, COUNT(*) AS count
FROM "UserProductRole"
WHERE product IN ('lecturercraft', 'scholarcraft')
GROUP BY product;

COMMIT;
