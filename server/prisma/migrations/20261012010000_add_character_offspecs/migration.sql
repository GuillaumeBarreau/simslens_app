-- SIMS-212 : spécialisations secondaires (off-specs) d'un personnage.
--
-- Table de liaison personnage ↔ spécialisation. La spé principale reste
-- characters.specializationId : l'API refuse qu'elle soit aussi off-spec, et
-- n'accepte que des spés de la classe du personnage.
--
-- Nouvelle table vide : aucune donnée existante n'est touchée. Rejouable
-- (IF NOT EXISTS sur chaque objet).

-- 1. Table
CREATE TABLE IF NOT EXISTS "character_offspecs" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "specializationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_offspecs_pkey" PRIMARY KEY ("id")
);

-- 2. Une spé n'est déclarée qu'une fois par personnage
CREATE UNIQUE INDEX IF NOT EXISTS "unique_character_offspec"
  ON "character_offspecs"("characterId", "specializationId");

-- 3. Index de la clé étrangère vers specializations (characterId est couvert
--    par l'index unique, dont il est la première colonne)
CREATE INDEX IF NOT EXISTS "idx_character_offspecs_specializationId"
  ON "character_offspecs"("specializationId");

-- 4. Clés étrangères : supprimer le personnage ou la spé supprime la liaison
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'character_offspecs_characterId_fkey'
  ) THEN
    ALTER TABLE "character_offspecs"
      ADD CONSTRAINT "character_offspecs_characterId_fkey"
      FOREIGN KEY ("characterId") REFERENCES "characters"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'character_offspecs_specializationId_fkey'
  ) THEN
    ALTER TABLE "character_offspecs"
      ADD CONSTRAINT "character_offspecs_specializationId_fkey"
      FOREIGN KEY ("specializationId") REFERENCES "specializations"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
