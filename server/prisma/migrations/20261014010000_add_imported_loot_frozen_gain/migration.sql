-- SIMS-229 : figer le gain estimé d'un objet au moment de l'import du loot.
--
-- `upgrades` ne garde que le dernier sim par (personnage, difficulté, spé) :
-- le gain d'un objet attribué est donc lu une fois, à l'import (sync_loot),
-- et recopié sur la ligne importée. Un sim ultérieur ne le modifie plus.
--
--   upgradePercent           gain du sim retenu, en % ;
--   upgradeSimAt             date de ce sim ;
--   upgradeSpecializationId  spé de ce sim (instantané, sans clé étrangère) ;
--   upgradeMetric            grandeur de ce sim (`upgrades.metric`, SIMS-202) :
--                            « dps » ou « hps » ; NULL se lit « dps ».
--
-- Colonnes nullables sans défaut : métadonnées seules, pas de réécriture de
-- la table ni des lignes existantes, qui restent à NULL (l'écran d'équité
-- revient alors à l'estimation depuis `upgrades`). Rejouable (IF NOT EXISTS,
-- contrainte ajoutée seulement si absente).

ALTER TABLE "imported_loots" ADD COLUMN IF NOT EXISTS "upgradePercent" DECIMAL(10,4);
ALTER TABLE "imported_loots" ADD COLUMN IF NOT EXISTS "upgradeSimAt" TIMESTAMP(3);
ALTER TABLE "imported_loots" ADD COLUMN IF NOT EXISTS "upgradeSpecializationId" INTEGER;
ALTER TABLE "imported_loots" ADD COLUMN IF NOT EXISTS "upgradeMetric" TEXT;

-- Valeurs admises (un CHECK laisse passer NULL). Colonne encore vide : la
-- validation de la contrainte est immédiate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'imported_loots_upgradeMetric_check'
  ) THEN
    ALTER TABLE "imported_loots"
      ADD CONSTRAINT "imported_loots_upgradeMetric_check"
      CHECK ("upgradeMetric" IN ('dps', 'hps'));
  END IF;
END $$;
