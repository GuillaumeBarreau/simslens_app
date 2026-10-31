-- Enrich character_key_runs with timing and source info for precise weekly tracking.

ALTER TABLE "character_key_runs"
  ADD COLUMN "shortName"   TEXT,
  ADD COLUMN "clearTimeMs" INTEGER,
  ADD COLUMN "parTimeMs"   INTEGER,
  ADD COLUMN "raiderIoUrl" TEXT;

CREATE INDEX "character_key_runs_characterId_completedAt_idx"
  ON "character_key_runs"("characterId", "completedAt");
