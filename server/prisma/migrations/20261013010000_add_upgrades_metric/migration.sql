-- SIMS-202 : grandeur simulée par chaque sim (`upgrades.metric`).
--
-- « dps » : rapport Raidbots (gains de DPS) ; « hps » : rapport QE Live
-- (QuestionablyEpic, soigneurs). Les colonnes dps / baseDps d'une sim « hps »
-- portent des valeurs de soin : elles ne doivent jamais être comparées telles
-- quelles à celles d'une sim « dps ».
--
-- Rejouable : colonne et contrainte ajoutées seulement si absentes ; le
-- rattrapage ne touche que les lignes encore à « dps ».

-- 1. Colonne. Défaut neutre « dps » : c'est ce que toutes les sims étaient
--    jusqu'ici (PostgreSQL 11+ : défaut constant, pas de réécriture de table).
ALTER TABLE "upgrades" ADD COLUMN IF NOT EXISTS "metric" TEXT NOT NULL DEFAULT 'dps';

-- 2. Valeurs admises.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upgrades_metric_check'
  ) THEN
    ALTER TABLE "upgrades"
      ADD CONSTRAINT "upgrades_metric_check" CHECK ("metric" IN ('dps', 'hps'));
  END IF;
END $$;

-- 3. Rattrapage des sims QE Live déjà importées. Le worker QE écrit des talents
--    vides et une spé de soin ; un rapport Raidbots porte toujours la chaîne de
--    talents de la sim. Les deux conditions réunies désignent les imports QE.
--    Une ligne qui n'y répond pas reste « dps » (défaut neutre).
UPDATE "upgrades" AS u
SET "metric" = 'hps'
FROM "specializations" AS s
WHERE u."specializationId" = s."id"
  AND s."role" = 'healer'
  AND u."talents" = ''
  AND u."metric" = 'dps';
