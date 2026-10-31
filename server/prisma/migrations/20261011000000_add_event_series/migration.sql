-- SIMS-200 : séries d'événements de raid récurrents.

-- CreateTable
CREATE TABLE "raid_event_series" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "raidDifficultyId" INTEGER,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "weeksAhead" INTEGER NOT NULL DEFAULT 4,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "defaultPresent" BOOLEAN NOT NULL DEFAULT false,
    "signupLockDisabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "generatedUntil" DATE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raid_event_series_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "raid_events" ADD COLUMN "seriesId" INTEGER,
ADD COLUMN "seriesOccurrenceDate" DATE;

-- CreateIndex
CREATE INDEX "idx_raid_event_series_realmId" ON "raid_event_series"("realmId");

-- CreateIndex
CREATE INDEX "idx_raid_event_series_active" ON "raid_event_series"("active");

-- CreateIndex
CREATE UNIQUE INDEX "uq_raid_events_series_occurrence" ON "raid_events"("seriesId", "seriesOccurrenceDate");

-- AddForeignKey
ALTER TABLE "raid_event_series" ADD CONSTRAINT "raid_event_series_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_event_series" ADD CONSTRAINT "raid_event_series_raidDifficultyId_fkey" FOREIGN KEY ("raidDifficultyId") REFERENCES "raid_difficulties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_events" ADD CONSTRAINT "raid_events_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "raid_event_series"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
