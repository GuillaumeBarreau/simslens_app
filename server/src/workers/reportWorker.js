const request = require('request');
const { prisma } = require('../data');
const redis = require('../shared/redis');
const reportValidator = require('../reportValidator');
const validationSettingsRepository = require('../api/validation_settings/validation_settings.repository');
const { resolveSimSpecializationId, upgradePurgeWhere } = require('./simSpecialization');
const { ReportImportError, resolveQEHealerSpecializationId } = require('./qeHealerSpecialization');

/** Grandeur simulée (`upgrades.metric`, SIMS-202). */
const RAIDBOTS_METRIC = 'dps';
const QE_METRIC = 'hps';

/**
 * @param {number | null} specializationId - spé résolue de la sim (SIMS-210), null si non reconnue
 */
async function insertUpgrade(
  charID,
  buildDate,
  result,
  baseDps,
  reportID,
  spec,
  talents,
  timeStamp,
  difficulty,
  specializationId = null,
) {
  const nameParts = result.name.split('/');
  const itemID = parseInt(nameParts[3], 10);

  try {
    await prisma.upgrades.create({
      data: {
        characterID: charID,
        itemID: itemID,
        reportID: reportID,
        dps: result.mean,
        baseDps: baseDps.mean,
        spec: spec,
        specializationId,
        metric: RAIDBOTS_METRIC,
        difficulty: difficulty,
        buildDate: buildDate,
        talents: talents,
        timeStamp: new Date(timeStamp * 1000),
      },
    });
  } catch (error) {
    console.error('Error inserting upgrade:', error);
    throw error;
  }
}

/**
 * Format: "item_name,id=237691,bonus_id=...,enchant_id=7978,gem_id=123/456"
 */
function extractItemId(encodedItem) {
  const match = encodedItem.match(/id=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractEnchantId(encodedItem) {
  const match = encodedItem.match(/enchant_id=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractGemIds(encodedItem) {
  const match = encodedItem.match(/gem_id=([\d/]+)/);
  return match ? match[1] : null;
}

function resolveEnchantId(slotData, encodedItem) {
  if (typeof slotData?.enchant_id === 'number' && slotData.enchant_id > 0) {
    return slotData.enchant_id;
  }
  return extractEnchantId(encodedItem);
}

function resolveGemIds(slotData, encodedItem) {
  if (typeof slotData?.gem_id === 'string' && slotData.gem_id.length > 0) {
    return slotData.gem_id;
  }
  const socketInfo = slotData?.socketInfo;
  if (socketInfo && typeof socketInfo === 'object') {
    const collected = [];
    for (const socket of Object.values(socketInfo)) {
      if (Array.isArray(socket?.gemIds)) {
        for (const id of socket.gemIds) {
          if (typeof id === 'number' && id > 0) collected.push(id);
        }
      }
    }
    if (collected.length > 0) return collected.join('/');
  }
  return extractGemIds(encodedItem);
}

async function saveGearSnapshot(
  characterId,
  reportID,
  gear,
  spec,
  difficulty,
  timestamp,
  upgradeData = {},
  raidInstanceIds = [],
  specializationId = null,
) {
  try {
    console.log(`[Gear Snapshot] Starting for character ${characterId}, report ${reportID}`);

    const snapshot = await prisma.character_gear_snapshots.create({
      data: {
        characterId,
        reportId: reportID,
        spec,
        specializationId,
        difficulty,
        timestamp: new Date(timestamp * 1000),
      },
    });

    console.log(`[Gear Snapshot] Created snapshot ${snapshot.id}`);

    const slots = [
      'head',
      'neck',
      'shoulders',
      'chest',
      'waist',
      'legs',
      'feet',
      'wrists',
      'hands',
      'finger1',
      'finger2',
      'trinket1',
      'trinket2',
      'back',
      'main_hand',
      'off_hand',
    ];

    let savedCount = 0;
    let skippedCount = 0;

    for (const slot of slots) {
      if (gear[slot] && gear[slot].encoded_item) {
        const encodedItem = gear[slot].encoded_item;
        const itemId = extractItemId(encodedItem);

        if (itemId) {
          try {
            const itemExists = await prisma.items.findUnique({
              where: { id: itemId },
              select: { id: true },
            });

            if (!itemExists) {
              console.log(
                `[Gear Snapshot] Item ${itemId} not found in items table, skipping slot ${slot}`,
              );
              skippedCount++;
              continue;
            }

            const slotNameMap = {
              head: 'head',
              neck: 'neck',
              shoulders: 'shoulder',
              back: 'back',
              chest: 'chest',
              wrists: 'wrist',
              hands: 'hands',
              waist: 'waist',
              legs: 'legs',
              feet: 'feet',
              finger1: 'finger1',
              finger2: 'finger2',
              trinket1: 'trinket1',
              trinket2: 'trinket2',
              main_hand: 'mainHand',
              off_hand: 'offHand',
            };

            const reportSlotName = slotNameMap[slot] || slot;
            const slotData = upgradeData[reportSlotName] || {};
            const upgradeInfo = slotData.upgrade || {};
            const baseItemLevel = slotData.baseItemLevel || null;

            let itemSource = 'other';
            let craftingQuality = null;

            if (slotData.profession) {
              itemSource = 'craft';
              craftingQuality = slotData.crafting_quality
                ? parseInt(slotData.crafting_quality)
                : null;
            } else if (slotData.sources && slotData.sources.length > 0) {
              const instanceId = slotData.sources[0].instanceId;
              if (instanceId === -82) {
                itemSource = 'token';
              } else if (raidInstanceIds.includes(instanceId)) {
                itemSource = 'raid';
              } else {
                itemSource = 'dungeon';
              }
            }

            await prisma.gear_snapshot_items.create({
              data: {
                snapshotId: snapshot.id,
                slot,
                itemId,
                ilevel: gear[slot].ilevel || 0,
                encodedItem,
                enchantId: resolveEnchantId(slotData, encodedItem),
                gemIds: resolveGemIds(slotData, encodedItem),
                upgradeLevel: upgradeInfo.level || null,
                upgradeMax: upgradeInfo.max || null,
                upgradeName: upgradeInfo.name || null,
                upgradeFullName: upgradeInfo.fullName || null,
                upgradeBonusId: upgradeInfo.bonusId || null,
                upgradeItemLevel: upgradeInfo.itemLevel || null,
                upgradeGroup: upgradeInfo.group || null,
                baseItemLevel: baseItemLevel,
                itemSource: itemSource,
                craftingQuality: craftingQuality,
              },
            });
            savedCount++;
          } catch (itemError) {
            console.error(`[Gear Snapshot] Error saving item for slot ${slot}:`, itemError.message);
            skippedCount++;
          }
        } else {
          console.log(`[Gear Snapshot] Could not extract item ID from ${encodedItem}`);
          skippedCount++;
        }
      }
    }

    console.log(
      `[Gear Snapshot] Saved ${savedCount} items, skipped ${skippedCount} items for character ${characterId}, report ${reportID}`,
    );
  } catch (error) {
    console.error('[Gear Snapshot] Error saving gear snapshot:', error);
    // Don't throw - we don't want to fail the entire report import if gear snapshot fails
  }
}

async function updateStatus(reportID, status, data = {}) {
  const key = `report:status:${reportID}`;
  const current = await redis.get(key);
  let statusObj = current ? JSON.parse(current) : {};

  statusObj = {
    ...statusObj,
    status,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(key, JSON.stringify(statusObj), 'EX', 3600);
}

/**
 * Statut « error » d'un import : le message, et le code d'un refus typé
 * (SIMS-202) pour que le front affiche un texte traduit.
 */
function errorStatus(error) {
  return {
    message: error.message || String(error),
    ...(error instanceof ReportImportError ? { code: error.code } : {}),
    progress: 'N/A',
  };
}

async function processReport(reportID) {
  try {
    const raids = await prisma.raids.findMany({ select: { instanceId: true } });
    const knownRaidIds = raids
      .map((r) => r.instanceId)
      .filter((id) => id !== null && id !== undefined);

    await updateStatus(reportID, 'processing', {
      message: 'Fetching report data from Raidbots...',
      progress: '10%',
    });

    console.log(`Worker: Fetching raidbots report ${reportID}`);
    const uri = `https://www.raidbots.com/reports/${reportID}/data.json`;

    const body = await new Promise((resolve, reject) => {
      request.get(uri, (error, response, body) => {
        if (error) return reject(error);
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to fetch report, status: ${response.statusCode}`));
        }
        resolve(body);
      });
    });

    let report = JSON.parse(body);
    const buildDate = new Date(`${report.build_date} ${report.build_time} UTC`);
    console.log(`Worker: Parsed build date :: ${buildDate.toISOString()}`);

    await updateStatus(reportID, 'processing', {
      message: 'Parsing character data...',
      progress: '20%',
    });

    let charName = report.simbot.meta.rawFormData.character.name;
    let charRealm = report.simbot.meta.rawFormData.character.realm;
    let reportDifficulty = 'mythic';

    if (
      report.sim &&
      report.sim.profilesets &&
      report.sim.profilesets.results &&
      report.sim.profilesets.results.length > 0 &&
      report.sim.profilesets.results[0].name
    ) {
      const nameParts = report.sim.profilesets.results[0].name.split('/');
      if (nameParts.length >= 3) {
        reportDifficulty = nameParts[2].split('-')[1];
      }
    }

    let reportSpec = '';
    if (report.sim && report.sim.players && report.sim.players.length > 0) {
      reportSpec = report.sim.players[0].specialization || '';
    }

    await updateStatus(reportID, 'processing', {
      message: `Processing character ${charName}-${charRealm} (${reportSpec}, ${reportDifficulty})...`,
      progress: '40%',
    });

    const character = await prisma.characters.findFirst({
      where: {
        name: { equals: charName, mode: 'insensitive' },
        realm: { equals: charRealm, mode: 'insensitive' },
      },
      select: {
        id: true,
        realmId: true,
        class: true,
      },
    });

    if (!character) {
      throw new Error(`Character '${charName}' from realm '${charRealm}' not found in database.`);
    }

    const simSpec = report.sim?.players?.[0]?.specialization;
    const specializationId = await resolveSimSpecializationId(character.class, simSpec);

    await updateStatus(reportID, 'processing', {
      message: 'Loading validation settings...',
      progress: '30%',
    });

    let validationSettings = await validationSettingsRepository.getValidationSettings(
      character.realmId,
    );

    if (!validationSettings) {
      console.log(
        `[Report Worker] No validation settings found for realm ${character.realmId}, using defaults`,
      );
      validationSettings = {
        allowedFightStyles: 'Patchwerk',
        fightLength: 300,
        enemyCount: 1,
        raidBuffsConfig: {
          bloodlust: true,
          arcaneIntellect: true,
          fortitude: true,
          battleShout: true,
          mysticTouch: true,
          chaosBrand: true,
          skyfury: true,
          markOfTheWild: true,
          huntersMark: true,
          powerInfusion: false,
        },
      };
    }

    await updateStatus(reportID, 'processing', {
      message: 'Validating report data...',
      progress: '35%',
    });

    if (report.simbot && report.simbot.meta && report.simbot.meta.title) {
      const fightStyleResult = reportValidator.validateFightStyle(
        report.simbot.fightStyle,
        validationSettings.allowedFightStyles,
      );
      if (!fightStyleResult.valid) throw new Error(fightStyleResult.message);

      const fightLengthResult = reportValidator.validateFightLength(
        report.simbot.fightLength,
        validationSettings.fightLength,
      );
      if (!fightLengthResult.valid) throw new Error(fightLengthResult.message);

      const enemyCountResult = reportValidator.validateEnemyCount(
        report.simbot.enemyCount,
        validationSettings.enemyCount,
      );
      if (!enemyCountResult.valid) throw new Error(enemyCountResult.message);

      const progressResult = reportValidator.validateReportProgressMaxed(report.simbot.meta.title);
      if (!progressResult.valid) throw new Error(progressResult.message);

      const upgradeRanksResult = reportValidator.validateUpgradeRanksMaxed(
        report.simbot.meta.rawFormData?.character?.items,
      );
      if (!upgradeRanksResult.valid) throw new Error(upgradeRanksResult.message);

      const raidBuffsResult = reportValidator.validateRaidBuffsMeta(
        {
          bloodlust: report.simbot.meta.bloodlust,
          arcaneIntellect: report.simbot.meta.arcaneIntellect,
          fortitude: report.simbot.meta.fortitude,
          battleShout: report.simbot.meta.battleShout,
          mysticTouch: report.simbot.meta.mysticTouch,
          chaosBrand: report.simbot.meta.chaosBrand,
          skyfury: report.simbot.meta.skyfury,
          markOfTheWild: report.simbot.meta.markOfTheWild,
          huntersMark: report.simbot.meta.huntersMark,
          powerInfusion: report.simbot.meta.powerInfusion,
        },
        validationSettings.raidBuffsConfig,
      );
      if (!raidBuffsResult.valid) throw new Error(raidBuffsResult.message);
    }

    await updateStatus(reportID, 'processing', {
      message: 'Report validated. Processing upgrades...',
      progress: '40%',
    });

    await prisma.upgrades.deleteMany({
      where: upgradePurgeWhere({
        characterId: character.id,
        difficulty: reportDifficulty,
        spec: reportSpec || null,
        specializationId,
      }),
    });

    const bestResultByItemId = new Map();
    for (const result of report.sim.profilesets.results) {
      const itemID = parseInt(result.name.split('/')[3], 10);
      if (Number.isNaN(itemID)) continue;
      const existing = bestResultByItemId.get(itemID);
      if (!existing || result.mean > existing.mean) {
        bestResultByItemId.set(itemID, result);
      }
    }
    const deduplicatedResults = Array.from(bestResultByItemId.values());

    const totalResults = deduplicatedResults.length;

    // For Augmentation Evoker, Raidbots emits profilesets using the `raid_dps` metric:
    // each result.mean is the whole-raid DPS, not the evoker's personal DPS. To keep the
    // (dps - baseDps) / baseDps formula correct, the baseline must also be whole-raid DPS —
    // i.e. the sum of every actor's collected_data.dps.mean.
    const isRaidDpsMetric =
      report.sim?.options?.profileset_metric === 'raid_dps' ||
      report.sim?.profilesets?.metric === 'Raid Damage per Second';

    let baseDpsSource = report.sim.players[0].collected_data.dps;
    if (isRaidDpsMetric) {
      const raidBaselineMean = report.sim.players.reduce(
        (sum, p) => sum + (p.collected_data?.dps?.mean || 0),
        0,
      );
      baseDpsSource = { ...report.sim.players[0].collected_data.dps, mean: raidBaselineMean };
    }

    for (let i = 0; i < totalResults; i++) {
      if (i % Math.ceil(totalResults / 10) === 0) {
        const percent = 40 + Math.floor((i / totalResults) * 50);
        await updateStatus(reportID, 'processing', {
          message: `Inserting upgrades (${i}/${totalResults})...`,
          progress: `${percent}%`,
        });
      }

      await insertUpgrade(
        character.id,
        report.build_date,
        deduplicatedResults[i],
        baseDpsSource,
        reportID,
        report.sim.players[0].specialization,
        report.sim.players[0].talents,
        report.timestamp,
        reportDifficulty,
        specializationId,
      );
    }

    if (report.sim && report.sim.players && report.sim.players[0].gear) {
      await updateStatus(reportID, 'processing', {
        message: 'Saving gear snapshot...',
        progress: '95%',
      });

      const upgradeData = report.simbot?.meta?.rawFormData?.character?.items || {};

      await saveGearSnapshot(
        character.id,
        reportID,
        report.sim.players[0].gear,
        report.sim.players[0].specialization,
        reportDifficulty,
        report.timestamp,

        upgradeData,
        knownRaidIds,
        specializationId,
      );
    }

    try {
      const { syncUpgradesFromBlizzard } = require('../services/blizzardSync.service');
      console.log(`[Report Worker] Syncing upgrades from Blizzard API for ${charName}...`);
      const syncResult = await syncUpgradesFromBlizzard(prisma, character.id);
      console.log(`[Report Worker] Blizzard sync completed: ${syncResult.updated} items updated`);
    } catch (syncError) {
      console.warn(`[Report Worker] Blizzard sync failed for ${charName}:`, syncError.message);
    }

    await updateStatus(reportID, 'completed', {
      message: 'Analysis completed successfully',
      progress: '100%',
      characterId: character.id,
      characterName: charName,
      reportId: reportID,
      timeStamp: report.timestamp,
    });
  } catch (error) {
    console.error(`Worker Error for report ${reportID}:`, error);
    await updateStatus(reportID, 'error', errorStatus(error));
    throw error;
  }
}

const QE_DIFFICULTY_MAP = {
  3: 'normal',
  5: 'heroic',
  7: 'mythic',
};

const QE_UPGRADE_TRACK_MAX = {
  Explorer: 6,
  Adventurer: 6,
  Veteran: 6,
  Champion: 6,
  Hero: 6,
  Myth: 6,
};

function mapQESlot(qeSlot, counters) {
  const SINGLE_SLOT_MAP = {
    Head: 'head',
    Neck: 'neck',
    Shoulder: 'shoulders',
    Back: 'back',
    Chest: 'chest',
    Wrist: 'wrists',
    Hands: 'hands',
    Waist: 'waist',
    Legs: 'legs',
    Feet: 'feet',
    'Main Hand': 'main_hand',
    '1H Weapon': 'main_hand',
    '2H Weapon': 'main_hand',
    'Off Hand': 'off_hand',
    Shield: 'off_hand',
  };

  if (SINGLE_SLOT_MAP[qeSlot]) return SINGLE_SLOT_MAP[qeSlot];

  if (qeSlot === 'Finger') {
    counters.finger = (counters.finger || 0) + 1;
    return counters.finger === 1 ? 'finger1' : 'finger2';
  }
  if (qeSlot === 'Trinket') {
    counters.trinket = (counters.trinket || 0) + 1;
    return counters.trinket === 1 ? 'trinket1' : 'trinket2';
  }

  return null;
}

async function saveQEGearSnapshot(
  characterId,
  characterName,
  characterRealm,
  characterRegion,
  reportID,
  equippedItems,
  spec,
  difficulty,
  timestamp,
  specializationId = null,
) {
  try {
    console.log(`[QE Gear Snapshot] Starting for character ${characterId}, report ${reportID}`);

    const blizzardSlotMap = {};
    try {
      const { getCharacterEquipment } = require('../integrations/blizzard/api');
      const region = (characterRegion || 'eu').toLowerCase();
      const realm = characterRealm.toLowerCase().replace(/\s+/g, '-');
      const equipment = await getCharacterEquipment(region, realm, characterName.toLowerCase());

      if (equipment?.equipped_items) {
        const { SLOT_MAPPING } = require('../services/blizzardSync.service');
        for (const bItem of equipment.equipped_items) {
          const dbSlot = SLOT_MAPPING[bItem.slot?.type];
          if (dbSlot) blizzardSlotMap[dbSlot] = bItem;
        }
        console.log(
          `[QE Gear Snapshot] Loaded ${Object.keys(blizzardSlotMap).length} slots from Blizzard API`,
        );
      }
    } catch (blizzardErr) {
      console.warn(
        `[QE Gear Snapshot] Blizzard API fetch failed, continuing without enchant/gem enrichment: ${blizzardErr.message}`,
      );
    }

    const snapshot = await prisma.character_gear_snapshots.create({
      data: {
        characterId,
        reportId: reportID,
        spec,
        specializationId,
        difficulty,
        timestamp: new Date(timestamp * 1000),
      },
    });

    const counters = {};
    let savedCount = 0;
    let skippedCount = 0;

    for (const item of equippedItems) {
      if (!item.isEquipped) continue;

      const slot = mapQESlot(item.slot, counters);
      if (!slot) {
        console.log(`[QE Gear Snapshot] Unknown slot "${item.slot}", skipping`);
        skippedCount++;
        continue;
      }

      try {
        const itemExists = await prisma.items.findUnique({
          where: { id: item.id },
          select: { id: true },
        });

        if (!itemExists) {
          console.log(
            `[QE Gear Snapshot] Item ${item.id} not in items table, skipping slot ${slot}`,
          );
          skippedCount++;
          continue;
        }

        let enchantId = null;
        let gemIds = item.gemString ? item.gemString.replace(/,/g, '/') : null;

        const bItem = blizzardSlotMap[slot];
        if (bItem && bItem.item?.id === item.id) {
          const permanentEnchant = bItem.enchantments?.find(
            (e) => e.enchantment_slot?.type === 'PERMANENT',
          );
          if (permanentEnchant?.enchantment_id) {
            enchantId = permanentEnchant.enchantment_id;
          }

          if (bItem.sockets?.length > 0) {
            const gemItemIds = bItem.sockets.map((s) => s.item?.id).filter(Boolean);
            if (gemItemIds.length > 0) {
              gemIds = gemItemIds.join('/');
            }
          }
        }

        const bonusIdStr = item.bonusIDS ? item.bonusIDS.split(':').join('/') : '';
        let encodedItem = `id=${item.id}`;
        if (bonusIdStr) encodedItem += `,bonus_id=${bonusIdStr}`;
        if (enchantId) encodedItem += `,enchant_id=${enchantId}`;
        if (gemIds) encodedItem += `,gem_id=${gemIds}`;

        const upgradeMax = QE_UPGRADE_TRACK_MAX[item.upgradeTrack] || null;
        const upgradeLevel = item.upgradeRank > 0 ? item.upgradeRank : null;
        const upgradeName = item.upgradeTrack || null;
        const upgradeFullName =
          upgradeName && upgradeLevel && upgradeMax
            ? `${upgradeName} ${upgradeLevel}/${upgradeMax}`
            : null;

        await prisma.gear_snapshot_items.create({
          data: {
            snapshotId: snapshot.id,
            slot,
            itemId: item.id,
            ilevel: item.level || 0,
            encodedItem,
            enchantId,
            gemIds,
            upgradeLevel,
            upgradeMax,
            upgradeName,
            upgradeFullName,
            upgradeBonusId: null,
            upgradeItemLevel: null,
            upgradeGroup: null,
            baseItemLevel: null,
            itemSource: 'other',
            craftingQuality: null,
          },
        });

        savedCount++;
      } catch (itemError) {
        console.error(`[QE Gear Snapshot] Error saving slot ${slot}:`, itemError.message);
        skippedCount++;
      }
    }

    console.log(
      `[QE Gear Snapshot] Saved ${savedCount} items, skipped ${skippedCount} for character ${characterId}`,
    );
  } catch (error) {
    console.error('[QE Gear Snapshot] Error:', error);
    // Non-blocking — don't fail the whole import
  }
}

async function processQEReport(reportID) {
  try {
    await updateStatus(reportID, 'processing', {
      message: 'Fetching report data from QuestionablyEpic...',
      progress: '10%',
    });

    const uri = `https://questionablyepic.com/api/getUpgradeReport.php?reportID=${reportID}`;
    console.log(`Worker: Fetching QE report ${reportID}`);

    const body = await new Promise((resolve, reject) => {
      request.get(uri, (error, response, body) => {
        if (error) return reject(error);
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to fetch QE report, status: ${response.statusCode}`));
        }
        resolve(body);
      });
    });

    const raw = JSON.parse(body);
    const report = typeof raw === 'string' ? JSON.parse(raw) : raw;

    await updateStatus(reportID, 'processing', {
      message: 'Parsing character data...',
      progress: '20%',
    });

    const charName = report.playername;
    const charRealm = report.realm;
    const reportSpec = report.spec || '';

    if (!charName || !charRealm) {
      throw new Error('Missing character name or realm in QE report.');
    }

    await updateStatus(reportID, 'processing', {
      message: `Processing character ${charName}-${charRealm} (${reportSpec})...`,
      progress: '30%',
    });

    const character = await prisma.characters.findFirst({
      where: {
        name: { equals: charName, mode: 'insensitive' },
        realm: { equals: charRealm, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        realm: true,
        region: true,
        class: true,
        specializationId: true,
        offspecs: { select: { specializationId: true } },
      },
    });

    if (!character) {
      throw new Error(`Character '${charName}' from realm '${charRealm}' not found in database.`);
    }

    // QE Live ne simule que des soigneurs : la sim est rattachée à une spé de
    // soin du personnage, ou l'import est refusé avant toute écriture (SIMS-202).
    const specializationId = await resolveQEHealerSpecializationId(character, reportSpec);

    const raidDifficulties = report.ufSettings?.raid ?? [];
    const raidResults = (report.results ?? []).filter((r) => r.dropLoc === 'Raid');

    if (raidResults.length === 0) {
      throw new Error('No raid upgrade results found in QE report.');
    }

    await updateStatus(reportID, 'processing', {
      message: 'Inserting upgrades...',
      progress: '40%',
    });

    const timestamp =
      Math.floor(new Date(report.timeCreated).getTime() / 1000) || Math.floor(Date.now() / 1000);
    const buildDate = report.dateCreated || new Date().toISOString().split('T')[0];

    for (const diffId of raidDifficulties) {
      const difficultyStr = QE_DIFFICULTY_MAP[diffId];
      if (!difficultyStr) {
        console.warn(`[QE Worker] Unknown difficulty ID ${diffId}, skipping`);
        continue;
      }

      const diffResults = raidResults.filter(
        (r) => r.dropDifficulty === diffId && r.percDiff > 0 && r.rawDiff > 0,
      );
      if (diffResults.length === 0) continue;

      await prisma.upgrades.deleteMany({
        where: upgradePurgeWhere({
          characterId: character.id,
          difficulty: difficultyStr,
          spec: reportSpec,
          specializationId,
        }),
      });

      // Limite connue de QE Live : seuls les niveaux d'amélioration 1/6 et 6/6
      // sont simulés. On garde le meilleur résultat de chaque objet, tel quel :
      // aucun niveau intermédiaire n'est extrapolé (SIMS-202).
      const bestByItemId = new Map();
      for (const r of diffResults) {
        const existing = bestByItemId.get(r.item);
        if (!existing || r.percDiff > existing.percDiff) {
          bestByItemId.set(r.item, r);
        }
      }

      for (const r of bestByItemId.values()) {
        // Reconstruct baseDps so the existing frontend formula
        // (dps - baseDps) / baseDps * 100 naturally yields percDiff (%).
        // baseDps = rawDiff * 100 / percDiff, dps = baseDps + rawDiff
        const baseDps = (r.rawDiff * 100) / r.percDiff;
        const dps = baseDps + r.rawDiff;

        try {
          await prisma.upgrades.create({
            data: {
              characterID: character.id,
              itemID: r.item,
              reportID: reportID,
              dps,
              baseDps,
              spec: reportSpec,
              specializationId,
              metric: QE_METRIC,
              difficulty: difficultyStr,
              buildDate: buildDate,
              talents: '',
              timeStamp: new Date(timestamp * 1000),
            },
          });
        } catch (err) {
          if (err.code === 'P2003' || err.code === 'P2002') {
            console.warn(`[QE Worker] Skipping item ${r.item} (${err.code})`);
          } else {
            throw err;
          }
        }
      }

      console.log(`[QE Worker] Inserted ${bestByItemId.size} upgrades for ${difficultyStr}`);
    }

    if (report.equippedItems?.length > 0) {
      await updateStatus(reportID, 'processing', {
        message: 'Saving gear snapshot...',
        progress: '95%',
      });
      const snapshotDiff = QE_DIFFICULTY_MAP[raidDifficulties[0]] || 'heroic';
      await saveQEGearSnapshot(
        character.id,
        character.name,
        character.realm,
        report.region,
        reportID,
        report.equippedItems,
        reportSpec,
        snapshotDiff,
        timestamp,
        specializationId,
      );
    }

    await updateStatus(reportID, 'completed', {
      message: 'Analysis completed successfully',
      progress: '100%',
      characterId: character.id,
      characterName: charName,
      reportId: reportID,
      timeStamp: timestamp,
    });
  } catch (error) {
    console.error(`Worker Error for QE report ${reportID}:`, error);
    await updateStatus(reportID, 'error', errorStatus(error));
    throw error;
  }
}

module.exports = {
  processReport,
  processQEReport,
};
