-- SIMS-029 : avancement des attunements de WoW Forever (Drakefire Amulet pour
-- Onyxia's Lair). Une ligne par personnage et par attunement ; `attunement`
-- est une clé du référentiel du code (api/attunement/attunement.definitions.ts),
-- `completedSteps` le nombre de quêtes faites dans la chaîne de la faction.
--
-- Nouvelle table : aucune donnée existante touchée. Rejouable.

CREATE TABLE IF NOT EXISTS "character_attunements" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "attunement" TEXT NOT NULL,
    "faction" TEXT,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_attunements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "character_attunements_characterId_attunement_key"
  ON "character_attunements"("characterId", "attunement");
CREATE INDEX IF NOT EXISTS "character_attunements_characterId_idx"
  ON "character_attunements"("characterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'character_attunements_characterId_fkey'
  ) THEN
    ALTER TABLE "character_attunements"
      ADD CONSTRAINT "character_attunements_characterId_fkey"
      FOREIGN KEY ("characterId") REFERENCES "characters"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'character_attunements_faction_check'
  ) THEN
    ALTER TABLE "character_attunements"
      ADD CONSTRAINT "character_attunements_faction_check"
      CHECK ("faction" IN ('alliance', 'horde'));
  END IF;
END $$;
