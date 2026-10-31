-- CreateTable
CREATE TABLE "dungeon_availabilities" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "realmId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "roles" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dungeon_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_dungeon_avail_userId" ON "dungeon_availabilities"("userId");

-- CreateIndex
CREATE INDEX "idx_dungeon_avail_realmId" ON "dungeon_availabilities"("realmId");

-- CreateIndex
CREATE INDEX "idx_dungeon_avail_date" ON "dungeon_availabilities"("date");

-- AddForeignKey
ALTER TABLE "dungeon_availabilities" ADD CONSTRAINT "dungeon_availabilities_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
