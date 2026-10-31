-- CreateTable
CREATE TABLE "dungeon_groups" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dungeon_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon_group_members" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "dungeon_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_dungeon_group_realmId" ON "dungeon_groups"("realmId");

-- CreateIndex
CREATE INDEX "idx_dungeon_group_date" ON "dungeon_groups"("date");

-- CreateIndex
CREATE UNIQUE INDEX "dungeon_group_members_groupId_userId_key" ON "dungeon_group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "idx_dungeon_group_member_groupId" ON "dungeon_group_members"("groupId");

-- AddForeignKey
ALTER TABLE "dungeon_groups" ADD CONSTRAINT "dungeon_groups_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_group_members" ADD CONSTRAINT "dungeon_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "dungeon_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
