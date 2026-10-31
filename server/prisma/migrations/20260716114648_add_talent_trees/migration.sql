-- AlterTable
ALTER TABLE "specializations" ADD COLUMN     "blizzardSpecId" INTEGER,
ADD COLUMN     "talentTreeId" INTEGER;

-- CreateTable
CREATE TABLE "talent_trees" (
    "id" SERIAL NOT NULL,
    "specializationId" INTEGER NOT NULL,
    "blizzardTreeId" INTEGER NOT NULL,
    "blizzardSpecId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_hero_subtrees" (
    "id" SERIAL NOT NULL,
    "treeId" INTEGER NOT NULL,
    "blizzardId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "talent_hero_subtrees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_nodes" (
    "id" SERIAL NOT NULL,
    "treeId" INTEGER NOT NULL,
    "blizzardNodeId" INTEGER NOT NULL,
    "nodeType" TEXT NOT NULL,
    "displayRow" INTEGER NOT NULL,
    "displayCol" INTEGER NOT NULL,
    "maxRank" INTEGER NOT NULL DEFAULT 1,
    "heroSubTreeId" INTEGER,
    "entries" JSONB NOT NULL,
    "unlockNodeIds" INTEGER[],

    CONSTRAINT "talent_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_talent_loadouts" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "specializationId" INTEGER NOT NULL,
    "label" TEXT,
    "selectedNodes" JSONB NOT NULL,
    "exportString" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_talent_loadouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "talent_trees_specializationId_key" ON "talent_trees"("specializationId");

-- CreateIndex
CREATE INDEX "talent_trees_specializationId_idx" ON "talent_trees"("specializationId");

-- CreateIndex
CREATE INDEX "talent_hero_subtrees_treeId_idx" ON "talent_hero_subtrees"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "talent_hero_subtrees_treeId_blizzardId_key" ON "talent_hero_subtrees"("treeId", "blizzardId");

-- CreateIndex
CREATE INDEX "talent_nodes_treeId_idx" ON "talent_nodes"("treeId");

-- CreateIndex
CREATE INDEX "talent_nodes_heroSubTreeId_idx" ON "talent_nodes"("heroSubTreeId");

-- CreateIndex
CREATE UNIQUE INDEX "talent_nodes_treeId_blizzardNodeId_key" ON "talent_nodes"("treeId", "blizzardNodeId");

-- CreateIndex
CREATE INDEX "character_talent_loadouts_characterId_idx" ON "character_talent_loadouts"("characterId");

-- CreateIndex
CREATE INDEX "character_talent_loadouts_specializationId_idx" ON "character_talent_loadouts"("specializationId");

-- CreateIndex
CREATE UNIQUE INDEX "character_talent_loadouts_characterId_specializationId_key" ON "character_talent_loadouts"("characterId", "specializationId");

-- AddForeignKey
ALTER TABLE "talent_trees" ADD CONSTRAINT "talent_trees_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_hero_subtrees" ADD CONSTRAINT "talent_hero_subtrees_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "talent_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_nodes" ADD CONSTRAINT "talent_nodes_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "talent_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_nodes" ADD CONSTRAINT "talent_nodes_heroSubTreeId_fkey" FOREIGN KEY ("heroSubTreeId") REFERENCES "talent_hero_subtrees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_talent_loadouts" ADD CONSTRAINT "character_talent_loadouts_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_talent_loadouts" ADD CONSTRAINT "character_talent_loadouts_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
