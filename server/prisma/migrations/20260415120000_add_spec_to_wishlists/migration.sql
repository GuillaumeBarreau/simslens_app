-- Add specializationId to character_wishlists so each (character, spec) pair
-- can own an independent wishlist.

-- 1. Add the column as nullable first so backfill can run
ALTER TABLE "character_wishlists" ADD COLUMN "specializationId" INTEGER;

-- 2. Backfill from the character's current specialization
UPDATE "character_wishlists" cw
SET "specializationId" = c."specializationId"
FROM "characters" c
WHERE cw."characterId" = c."id"
  AND c."specializationId" IS NOT NULL;

-- 3. Drop orphan rows whose character has no specialization (cannot be attributed)
DELETE FROM "character_wishlists"
WHERE "specializationId" IS NULL;

-- 4. Enforce NOT NULL
ALTER TABLE "character_wishlists" ALTER COLUMN "specializationId" SET NOT NULL;

-- 5. Replace the unique constraint to include specializationId
DROP INDEX "character_wishlists_characterId_slot_difficulty_key";
CREATE UNIQUE INDEX "character_wishlists_characterId_specializationId_slot_diffi_key"
  ON "character_wishlists"("characterId", "specializationId", "slot", "difficulty");

-- 6. Index for lookups by spec
CREATE INDEX "character_wishlists_specializationId_idx"
  ON "character_wishlists"("specializationId");

-- 7. Foreign key to specializations (Restrict: avoid silent wishlist loss)
ALTER TABLE "character_wishlists"
  ADD CONSTRAINT "character_wishlists_specializationId_fkey"
  FOREIGN KEY ("specializationId") REFERENCES "specializations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
