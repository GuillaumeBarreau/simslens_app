-- CreateTable
CREATE TABLE "character_key_runs" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "dungeon" TEXT NOT NULL,
    "keystoneLevel" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "score" DOUBLE PRECISION,
    "numUpgrades" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_key_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_key_runs_characterId_idx" ON "character_key_runs"("characterId");

-- CreateIndex
CREATE INDEX "character_key_runs_completedAt_idx" ON "character_key_runs"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "character_key_runs_characterId_dungeon_completedAt_key" ON "character_key_runs"("characterId", "dungeon", "completedAt");

-- AddForeignKey
ALTER TABLE "character_key_runs" ADD CONSTRAINT "character_key_runs_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
