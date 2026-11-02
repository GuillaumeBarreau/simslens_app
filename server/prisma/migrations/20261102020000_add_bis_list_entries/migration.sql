-- SIMS-030 : listes BiS des guildes WoW Forever. Pour une spé, un palier et un
-- emplacement, les objets visés dans l'ordre (rang 1 = BiS) ; une liste de guilde
-- remplace, pour cet emplacement, la liste de référence du code.
--
-- Nouvelle table : aucune donnée existante touchée. Rejouable.

CREATE TABLE IF NOT EXISTS "bis_list_entries" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "specializationId" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "note" TEXT,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bis_list_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bis_list_entries_realmId_specializationId_season_slot_rank_key"
  ON "bis_list_entries"("realmId", "specializationId", "season", "slot", "rank");
CREATE INDEX IF NOT EXISTS "bis_list_entries_realmId_specializationId_idx"
  ON "bis_list_entries"("realmId", "specializationId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bis_list_entries_realmId_fkey') THEN
    ALTER TABLE "bis_list_entries"
      ADD CONSTRAINT "bis_list_entries_realmId_fkey"
      FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bis_list_entries_specializationId_fkey') THEN
    ALTER TABLE "bis_list_entries"
      ADD CONSTRAINT "bis_list_entries_specializationId_fkey"
      FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bis_list_entries_rank_check') THEN
    ALTER TABLE "bis_list_entries" ADD CONSTRAINT "bis_list_entries_rank_check" CHECK ("rank" >= 1);
  END IF;
END $$;
