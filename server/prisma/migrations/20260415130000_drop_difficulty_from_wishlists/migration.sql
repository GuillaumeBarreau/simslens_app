-- Dedupe character_wishlists on (characterId, specializationId, slot)
-- keeping the highest-priority difficulty: mythic > heroic > normal > lfr.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "characterId", "specializationId", slot
      ORDER BY
        CASE difficulty
          WHEN 'mythic' THEN 1
          WHEN 'heroic' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'lfr'    THEN 4
          ELSE 5
        END,
        id DESC
    ) AS rn
  FROM character_wishlists
)
DELETE FROM character_wishlists
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Drop the old unique index that included difficulty
ALTER TABLE "character_wishlists"
  DROP CONSTRAINT IF EXISTS "character_wishlists_characterId_specializationId_slot_diff_key";

-- Drop the FK to difficulties
ALTER TABLE "character_wishlists"
  DROP CONSTRAINT IF EXISTS "character_wishlists_difficulty_fkey";

-- Drop the column
ALTER TABLE "character_wishlists" DROP COLUMN IF EXISTS "difficulty";

-- Create the new unique index without difficulty
CREATE UNIQUE INDEX "character_wishlists_characterId_specializationId_slot_key"
  ON "character_wishlists" ("characterId", "specializationId", "slot");
