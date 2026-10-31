-- SIMS-210 : rattacher les sims (upgrades, gear snapshots) à une spécialisation
-- et rattraper characters.specializationId depuis characters.spec.
--
-- Rejouable : chaque étape vérifie ce qui existe déjà (IF NOT EXISTS) et les
-- rattrapages ne touchent que les lignes encore à NULL. Une interruption au
-- milieu se reprend en relançant le script.
--
-- Rapprochement d'un libellé de spé (sim Raidbots / QE, ou characters.spec)
-- avec `specializations`, dans la classe du personnage, insensible à la casse,
-- aux espaces autour et aux « _ » :
--   « Elemental »          → Elemental (shaman)
--   « Elemental Shaman »   → Elemental (shaman)      nom + classe
--   « frost death_knight » → Frost (death_knight)
-- Un libellé non reconnu laisse specializationId à NULL.
--
-- Clé unique de `upgrades` : inchangée (characterID, itemID, reportID,
-- difficulty, spec). specializationId est déterminé par (classe du personnage,
-- spec), deux colonnes déjà couvertes : l'ajouter n'empêcherait aucun doublon
-- de plus, et une colonne nullable dans une clé unique PostgreSQL laisse passer
-- les doublons à NULL.

-- 1. Colonnes (ajout d'une colonne nullable sans défaut : métadonnées seules,
--    pas de réécriture de la table).
ALTER TABLE "upgrades" ADD COLUMN IF NOT EXISTS "specializationId" INTEGER;
ALTER TABLE "character_gear_snapshots" ADD COLUMN IF NOT EXISTS "specializationId" INTEGER;

-- 2. Clés étrangères (colonnes encore vides : validation immédiate).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upgrades_specializationId_fkey'
  ) THEN
    ALTER TABLE "upgrades"
      ADD CONSTRAINT "upgrades_specializationId_fkey"
      FOREIGN KEY ("specializationId") REFERENCES "specializations"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'character_gear_snapshots_specializationId_fkey'
  ) THEN
    ALTER TABLE "character_gear_snapshots"
      ADD CONSTRAINT "character_gear_snapshots_specializationId_fkey"
      FOREIGN KEY ("specializationId") REFERENCES "specializations"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- 3. Rattrapage des upgrades : un seul UPDATE ... FROM (pas de boucle). Les
--    index sur specializationId sont créés après, pour que l'UPDATE n'ait pas
--    à les maintenir.
UPDATE "upgrades" AS u
SET "specializationId" = s."id"
FROM "characters" AS ch
JOIN "classes" AS cl ON cl."name" = ch."class"
JOIN "specializations" AS s ON s."classId" = cl."id"
WHERE u."characterID" = ch."id"
  AND u."specializationId" IS NULL
  AND replace(lower(btrim(u."spec")), '_', ' ') IN (
    lower(s."name"),
    lower(s."name") || ' ' || replace(cl."name", '_', ' ')
  );

-- 4. Rattrapage des gear snapshots, même règle.
UPDATE "character_gear_snapshots" AS g
SET "specializationId" = s."id"
FROM "characters" AS ch
JOIN "classes" AS cl ON cl."name" = ch."class"
JOIN "specializations" AS s ON s."classId" = cl."id"
WHERE g."characterId" = ch."id"
  AND g."specializationId" IS NULL
  AND replace(lower(btrim(g."spec")), '_', ' ') IN (
    lower(s."name"),
    lower(s."name") || ' ' || replace(cl."name", '_', ' ')
  );

-- 5. Rattrapage de characters.specializationId depuis characters.spec, dans la
--    classe du personnage. Une spé déjà posée n'est jamais écrasée, et
--    characters.spec n'est pas modifié.
UPDATE "characters" AS ch
SET "specializationId" = s."id"
FROM "classes" AS cl
JOIN "specializations" AS s ON s."classId" = cl."id"
WHERE cl."name" = ch."class"
  AND ch."specializationId" IS NULL
  AND ch."spec" IS NOT NULL
  AND replace(lower(btrim(ch."spec")), '_', ' ') IN (
    lower(s."name"),
    lower(s."name") || ' ' || replace(cl."name", '_', ' ')
  );

-- 6. Index des nouvelles clés étrangères.
CREATE INDEX IF NOT EXISTS "idx_upgrades_specializationId"
  ON "upgrades"("specializationId");
CREATE INDEX IF NOT EXISTS "idx_gear_snapshots_specializationId"
  ON "character_gear_snapshots"("specializationId");
