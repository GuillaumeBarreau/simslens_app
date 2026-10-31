-- AlterTable
ALTER TABLE "realms" ADD COLUMN "discordRaidCategoryId" TEXT;

-- CreateTable
CREATE TABLE "raid_guests" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "realmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raid_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_guest_assignments" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raid_guest_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_raid_guests_eventId" ON "raid_guests"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "raid_guest_assignments_guestId_bossId_key" ON "raid_guest_assignments"("guestId", "bossId");

-- AddForeignKey
ALTER TABLE "raid_guests" ADD CONSTRAINT "raid_guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "raid_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_guests" ADD CONSTRAINT "raid_guests_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_guest_assignments" ADD CONSTRAINT "raid_guest_assignments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "raid_guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raid_guest_assignments" ADD CONSTRAINT "raid_guest_assignments_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
