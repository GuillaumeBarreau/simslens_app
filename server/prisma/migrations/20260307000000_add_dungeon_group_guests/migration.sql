-- CreateTable
CREATE TABLE "dungeon_group_guests" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "realmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "class" TEXT,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dungeon_group_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_dungeon_group_guest_groupId" ON "dungeon_group_guests"("groupId");

-- AddForeignKey
ALTER TABLE "dungeon_group_guests" ADD CONSTRAINT "dungeon_group_guests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "dungeon_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
