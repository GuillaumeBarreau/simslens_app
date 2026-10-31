-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('PRESENT', 'ABSENT', 'TENTATIVE', 'BENCH', 'LATE');

-- CreateTable
CREATE TABLE "characters" (
    "id" SERIAL NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "region" TEXT DEFAULT 'EU',
    "thumbnail" TEXT,
    "archived" INTEGER DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'approved',
    "spec" TEXT,
    "specializationId" INTEGER,
    "currentPeriodKeyCount" INTEGER DEFAULT 0,
    "ManaforgeBuff" TEXT,
    "ilvl" INTEGER,
    "score" INTEGER,
    "discordTag" TEXT,
    "realmId" INTEGER,
    "userId" TEXT,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raids" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "instanceId" INTEGER,
    "description" TEXT,
    "image_button" TEXT,
    "image_button_small" TEXT,
    "image_background" TEXT,
    "extension" TEXT,
    "season" TEXT,

    CONSTRAINT "raids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realms" (
    "id" SERIAL NOT NULL,
    "server" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'EU',
    "guildName" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discordGuildId" TEXT,

    CONSTRAINT "realms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realm_owners" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',

    CONSTRAINT "realm_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specializations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_loots" (
    "id" SERIAL NOT NULL,
    "importID" INTEGER NOT NULL,
    "characterID" INTEGER,
    "player" TEXT,
    "date" TEXT,
    "time" TEXT,
    "itemID" INTEGER,
    "response" TEXT,
    "instance" TEXT,
    "owner" INTEGER,

    CONSTRAINT "imported_loots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "importedAt" INTEGER NOT NULL,
    "rowCount" INTEGER NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "itemLevel" INTEGER NOT NULL,
    "inventoryType" INTEGER,
    "itemClass" INTEGER,
    "itemSubClass" INTEGER,
    "allowableClasses" TEXT,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_tokens" (
    "id" SERIAL NOT NULL,
    "tokenItemId" INTEGER NOT NULL,
    "rewardItemId" INTEGER NOT NULL,
    "class" TEXT NOT NULL,
    "armorType" TEXT,
    "slot" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,

    CONSTRAINT "item_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "difficulties" (
    "name" TEXT NOT NULL,

    CONSTRAINT "difficulties_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "upgrades" (
    "id" SERIAL NOT NULL,
    "characterID" INTEGER NOT NULL,
    "itemID" INTEGER NOT NULL,
    "reportID" TEXT NOT NULL,
    "dps" DOUBLE PRECISION NOT NULL,
    "baseDps" DOUBLE PRECISION NOT NULL,
    "spec" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "timeStamp" TIMESTAMP(3) NOT NULL,
    "talents" TEXT NOT NULL DEFAULT '',
    "buildDate" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instances" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "raidDifficultyId" INTEGER NOT NULL,
    "realmId" INTEGER NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "bossesKilled" INTEGER NOT NULL DEFAULT 0,
    "totalBosses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_difficulties" (
    "id" SERIAL NOT NULL,
    "raidId" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "description" TEXT,
    "image_button" TEXT,
    "image_button_small" TEXT,
    "image_background" TEXT,

    CONSTRAINT "raid_difficulties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_bosses" (
    "id" SERIAL NOT NULL,
    "instanceId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,
    "killed" BOOLEAN NOT NULL DEFAULT false,
    "killedAt" TIMESTAMP(3),

    CONSTRAINT "instance_bosses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bosses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "raidName" TEXT,
    "order" INTEGER NOT NULL,
    "icon" TEXT,

    CONSTRAINT "bosses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boss_drop" (
    "id" SERIAL NOT NULL,
    "bossId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,

    CONSTRAINT "boss_drop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_loots" (
    "id" SERIAL NOT NULL,
    "instanceId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "assignedTo" INTEGER,
    "assignedBy" INTEGER,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_loots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loot_votes" (
    "id" SERIAL NOT NULL,
    "lootId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "choice" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loot_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_wishlists" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "itemId" INTEGER,
    "priority" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'heroic',

    CONSTRAINT "character_wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "raidDifficultyId" INTEGER,
    "realmId" INTEGER NOT NULL,
    "discordEventId" TEXT,
    "discordChannelId" TEXT,
    "discordMessageId" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "raid_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raid_signups" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "status" "SignupStatus" NOT NULL DEFAULT 'PRESENT',
    "role" TEXT,
    "lateTime" TEXT,
    "absenceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raid_signups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_absences" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "realmId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_gear_snapshots" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "reportId" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_gear_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_snapshot_items" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "ilevel" INTEGER NOT NULL,
    "encodedItem" TEXT NOT NULL,
    "enchantId" INTEGER,
    "gemIds" TEXT,
    "upgradeLevel" INTEGER,
    "upgradeMax" INTEGER,
    "upgradeName" TEXT,
    "upgradeFullName" TEXT,
    "upgradeBonusId" INTEGER,
    "upgradeItemLevel" INTEGER,
    "upgradeGroup" INTEGER,
    "baseItemLevel" INTEGER,
    "itemSource" TEXT,
    "craftingQuality" INTEGER,

    CONSTRAINT "gear_snapshot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enchantments" (
    "id" INTEGER NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "tokenizedName" VARCHAR(255) NOT NULL,
    "spellId" INTEGER,
    "spellIcon" VARCHAR(255),
    "itemId" INTEGER,
    "itemIcon" VARCHAR(255),
    "quality" INTEGER,
    "expansion" INTEGER,
    "craftingQuality" INTEGER,
    "slot" VARCHAR(50),
    "socketType" VARCHAR(50),
    "categoryId" INTEGER,
    "categoryName" VARCHAR(100),
    "stats" JSONB,

    CONSTRAINT "enchantments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_bonus_data" (
    "id" INTEGER NOT NULL,
    "upgrade_group" INTEGER,
    "upgrade_level" INTEGER,
    "upgrade_max" INTEGER,
    "upgrade_name" VARCHAR(50),
    "upgrade_full_name" VARCHAR(100),
    "upgrade_item_level" INTEGER,
    "upgrade_season_id" INTEGER,
    "upgrade_priority" INTEGER DEFAULT 0,
    "quality" INTEGER,
    "level_modifier" INTEGER,
    "tag" VARCHAR(100),
    "raw_stats" JSONB,
    "stats_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_bonus_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wow_items" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "item_level" INTEGER NOT NULL,
    "inventory_type" INTEGER NOT NULL,
    "item_class" INTEGER NOT NULL,
    "item_subclass" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "stats" JSONB,
    "raw_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wow_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_roster_assignments" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "bossId" INTEGER,
    "role" VARCHAR(20) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_roster_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_settings" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "allowedFightStyles" TEXT[] DEFAULT ARRAY['Patchwerk']::TEXT[],
    "fightLength" INTEGER NOT NULL DEFAULT 300,
    "enemyCount" INTEGER NOT NULL DEFAULT 1,
    "raidBuffsConfig" JSONB NOT NULL DEFAULT '{"skyfury": true, "bloodlust": true, "fortitude": true, "chaosBrand": true, "battleShout": true, "huntersMark": true, "mysticTouch": true, "markOfTheWild": true, "powerInfusion": false, "arcaneIntellect": true}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_characters_archived" ON "characters"("archived");

-- CreateIndex
CREATE INDEX "idx_characters_realmId" ON "characters"("realmId");

-- CreateIndex
CREATE INDEX "idx_characters_userId" ON "characters"("userId");

-- CreateIndex
CREATE INDEX "idx_characters_specializationId" ON "characters"("specializationId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_character_name_realm" ON "characters"("name", "realm");

-- CreateIndex
CREATE UNIQUE INDEX "raids_name_key" ON "raids"("name");

-- CreateIndex
CREATE UNIQUE INDEX "raids_instanceId_key" ON "raids"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "realms_region_server_guildName_key" ON "realms"("region", "server", "guildName");

-- CreateIndex
CREATE INDEX "realm_owners_ownerId_idx" ON "realm_owners"("ownerId");

-- CreateIndex
CREATE INDEX "realm_owners_realmId_idx" ON "realm_owners"("realmId");

-- CreateIndex
CREATE UNIQUE INDEX "realm_owners_realmId_ownerId_key" ON "realm_owners"("realmId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_name_key" ON "classes"("name");

-- CreateIndex
CREATE INDEX "specializations_classId_idx" ON "specializations"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "specializations_name_classId_key" ON "specializations"("name", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_imported_loots_unique_tuple" ON "imported_loots"("player", "date", "time", "itemID");

-- CreateIndex
CREATE INDEX "item_tokens_rewardItemId_idx" ON "item_tokens"("rewardItemId");

-- CreateIndex
CREATE INDEX "idx_upgrades_timestamp" ON "upgrades"("timeStamp");

-- CreateIndex
CREATE UNIQUE INDEX "characterID_itemID_reportID_difficulty_spec" ON "upgrades"("characterID", "itemID", "reportID", "difficulty", "spec");

-- CreateIndex
CREATE INDEX "idx_raids_realmId" ON "instances"("realmId");

-- CreateIndex
CREATE INDEX "idx_instances_raidDifficultyId" ON "instances"("raidDifficultyId");

-- CreateIndex
CREATE INDEX "idx_raid_difficulties_raidId" ON "raid_difficulties"("raidId");

-- CreateIndex
CREATE INDEX "idx_raid_difficulties_difficulty" ON "raid_difficulties"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "raid_difficulties_raidId_difficulty_key" ON "raid_difficulties"("raidId", "difficulty");

-- CreateIndex
CREATE INDEX "idx_instance_bosses_instanceId" ON "instance_bosses"("instanceId");

-- CreateIndex
CREATE INDEX "idx_instance_bosses_bossId" ON "instance_bosses"("bossId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_instance_bosses_unique" ON "instance_bosses"("instanceId", "bossId");

-- CreateIndex
CREATE INDEX "idx_bosses_extension_season" ON "bosses"("extension", "season");

-- CreateIndex
CREATE INDEX "idx_boss_drop_bossId" ON "boss_drop"("bossId");

-- CreateIndex
CREATE INDEX "idx_boss_drop_itemId" ON "boss_drop"("itemId");

-- CreateIndex
CREATE INDEX "idx_instance_loots_instanceId" ON "instance_loots"("instanceId");

-- CreateIndex
CREATE INDEX "idx_instance_loots_bossId" ON "instance_loots"("bossId");

-- CreateIndex
CREATE INDEX "idx_instance_loots_itemId" ON "instance_loots"("itemId");

-- CreateIndex
CREATE INDEX "idx_loot_votes_lootId" ON "loot_votes"("lootId");

-- CreateIndex
CREATE INDEX "idx_loot_votes_playerId" ON "loot_votes"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_loot_votes_unique" ON "loot_votes"("lootId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE INDEX "servers_region_idx" ON "servers"("region");

-- CreateIndex
CREATE UNIQUE INDEX "servers_slug_region_key" ON "servers"("slug", "region");

-- CreateIndex
CREATE INDEX "character_wishlists_characterId_idx" ON "character_wishlists"("characterId");

-- CreateIndex
CREATE INDEX "character_wishlists_itemId_idx" ON "character_wishlists"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "character_wishlists_characterId_slot_difficulty_key" ON "character_wishlists"("characterId", "slot", "difficulty");

-- CreateIndex
CREATE INDEX "idx_raid_events_realmId" ON "raid_events"("realmId");

-- CreateIndex
CREATE INDEX "idx_raid_events_raidDifficultyId" ON "raid_events"("raidDifficultyId");

-- CreateIndex
CREATE INDEX "idx_raid_events_startTime" ON "raid_events"("startTime");

-- CreateIndex
CREATE INDEX "idx_raid_events_status" ON "raid_events"("status");

-- CreateIndex
CREATE INDEX "idx_raid_signups_eventId" ON "raid_signups"("eventId");

-- CreateIndex
CREATE INDEX "idx_raid_signups_characterId" ON "raid_signups"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_raid_signups_unique" ON "raid_signups"("eventId", "characterId");

-- CreateIndex
CREATE INDEX "idx_member_absences_userId" ON "member_absences"("userId");

-- CreateIndex
CREATE INDEX "idx_member_absences_realmId" ON "member_absences"("realmId");

-- CreateIndex
CREATE INDEX "idx_member_absences_dates" ON "member_absences"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "idx_member_absences_unique" ON "member_absences"("userId", "realmId", "startDate");

-- CreateIndex
CREATE INDEX "idx_gear_snapshots_characterId" ON "character_gear_snapshots"("characterId");

-- CreateIndex
CREATE INDEX "idx_gear_snapshots_reportId" ON "character_gear_snapshots"("reportId");

-- CreateIndex
CREATE INDEX "idx_gear_snapshots_timestamp" ON "character_gear_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "idx_gear_snapshot_items_snapshotId" ON "gear_snapshot_items"("snapshotId");

-- CreateIndex
CREATE INDEX "idx_gear_snapshot_items_itemId" ON "gear_snapshot_items"("itemId");

-- CreateIndex
CREATE INDEX "enchantments_spellId_idx" ON "enchantments"("spellId");

-- CreateIndex
CREATE INDEX "enchantments_itemId_idx" ON "enchantments"("itemId");

-- CreateIndex
CREATE INDEX "enchantments_categoryId_idx" ON "enchantments"("categoryId");

-- CreateIndex
CREATE INDEX "item_bonus_data_upgrade_group_idx" ON "item_bonus_data"("upgrade_group");

-- CreateIndex
CREATE INDEX "item_bonus_data_upgrade_priority_idx" ON "item_bonus_data"("upgrade_priority" DESC);

-- CreateIndex
CREATE INDEX "item_bonus_data_upgrade_season_id_idx" ON "item_bonus_data"("upgrade_season_id");

-- CreateIndex
CREATE INDEX "wow_items_quality_idx" ON "wow_items"("quality");

-- CreateIndex
CREATE INDEX "wow_items_item_level_idx" ON "wow_items"("item_level");

-- CreateIndex
CREATE INDEX "event_roster_assignments_eventId_idx" ON "event_roster_assignments"("eventId");

-- CreateIndex
CREATE INDEX "event_roster_assignments_characterId_idx" ON "event_roster_assignments"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "event_roster_assignments_eventId_characterId_bossId_key" ON "event_roster_assignments"("eventId", "characterId", "bossId");

-- CreateIndex
CREATE UNIQUE INDEX "validation_settings_realmId_key" ON "validation_settings"("realmId");

-- CreateIndex
CREATE INDEX "validation_settings_realmId_idx" ON "validation_settings"("realmId");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_class_fkey" FOREIGN KEY ("class") REFERENCES "classes"("name") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "realms" ADD CONSTRAINT "realms_server_region_fkey" FOREIGN KEY ("server", "region") REFERENCES "servers"("slug", "region") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realm_owners" ADD CONSTRAINT "realm_owners_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specializations" ADD CONSTRAINT "specializations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_loots" ADD CONSTRAINT "imported_loots_owner_fkey" FOREIGN KEY ("owner") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "imported_loots" ADD CONSTRAINT "imported_loots_characterID_fkey" FOREIGN KEY ("characterID") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "imported_loots" ADD CONSTRAINT "imported_loots_importID_fkey" FOREIGN KEY ("importID") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item_tokens" ADD CONSTRAINT "item_tokens_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrades" ADD CONSTRAINT "upgrades_difficulty_fkey" FOREIGN KEY ("difficulty") REFERENCES "difficulties"("name") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "upgrades" ADD CONSTRAINT "upgrades_itemID_fkey" FOREIGN KEY ("itemID") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "upgrades" ADD CONSTRAINT "upgrades_characterID_fkey" FOREIGN KEY ("characterID") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_raidDifficultyId_fkey" FOREIGN KEY ("raidDifficultyId") REFERENCES "raid_difficulties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_difficulties" ADD CONSTRAINT "raid_difficulties_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "raids"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_difficulties" ADD CONSTRAINT "raid_difficulties_difficulty_fkey" FOREIGN KEY ("difficulty") REFERENCES "difficulties"("name") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instance_bosses" ADD CONSTRAINT "instance_bosses_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instance_bosses" ADD CONSTRAINT "instance_bosses_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boss_drop" ADD CONSTRAINT "boss_drop_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boss_drop" ADD CONSTRAINT "boss_drop_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instance_loots" ADD CONSTRAINT "instance_loots_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instance_loots" ADD CONSTRAINT "instance_loots_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "instance_loots" ADD CONSTRAINT "instance_loots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "loot_votes" ADD CONSTRAINT "loot_votes_lootId_fkey" FOREIGN KEY ("lootId") REFERENCES "instance_loots"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_region_fkey" FOREIGN KEY ("region") REFERENCES "regions"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_wishlists" ADD CONSTRAINT "character_wishlists_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_wishlists" ADD CONSTRAINT "character_wishlists_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_wishlists" ADD CONSTRAINT "character_wishlists_difficulty_fkey" FOREIGN KEY ("difficulty") REFERENCES "difficulties"("name") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_events" ADD CONSTRAINT "raid_events_raidDifficultyId_fkey" FOREIGN KEY ("raidDifficultyId") REFERENCES "raid_difficulties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_events" ADD CONSTRAINT "raid_events_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_signups" ADD CONSTRAINT "raid_signups_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "raid_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raid_signups" ADD CONSTRAINT "raid_signups_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_absences" ADD CONSTRAINT "member_absences_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_gear_snapshots" ADD CONSTRAINT "character_gear_snapshots_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_snapshot_items" ADD CONSTRAINT "gear_snapshot_items_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "character_gear_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_snapshot_items" ADD CONSTRAINT "gear_snapshot_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_roster_assignments" ADD CONSTRAINT "event_roster_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "raid_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_roster_assignments" ADD CONSTRAINT "event_roster_assignments_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_roster_assignments" ADD CONSTRAINT "event_roster_assignments_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_settings" ADD CONSTRAINT "validation_settings_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
