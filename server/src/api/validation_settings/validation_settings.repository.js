const { prisma } = require('../../data');

async function getValidationSettings(realmId) {
  const result = await prisma.$queryRaw`
    SELECT * FROM validation_settings WHERE "realmId" = ${realmId}
  `;
  return result[0] || null;
}

async function createValidationSettings(realmId, settings) {
  const { allowedFightStyles, fightLength, enemyCount, raidBuffsConfig } = settings;
  const result = await prisma.$queryRaw`
    INSERT INTO validation_settings ("realmId", "allowedFightStyles", "fightLength", "enemyCount", "raidBuffsConfig")
    VALUES (${realmId}, ${allowedFightStyles}, ${fightLength}, ${enemyCount}, ${JSON.stringify(raidBuffsConfig)}::jsonb)
    RETURNING *
  `;
  return result[0];
}

async function updateValidationSettings(realmId, settings) {
  const { allowedFightStyles, fightLength, enemyCount, raidBuffsConfig } = settings;
  const result = await prisma.$queryRaw`
    UPDATE validation_settings
    SET "allowedFightStyles" = ${allowedFightStyles},
        "fightLength" = ${fightLength},
        "enemyCount" = ${enemyCount},
        "raidBuffsConfig" = ${JSON.stringify(raidBuffsConfig)}::jsonb,
        "updatedAt" = NOW()
    WHERE "realmId" = ${realmId}
    RETURNING *
  `;
  return result[0];
}

/** Défaut de la colonne simStaleAfterDays (schema.prisma, SIMS-228). */
const DEFAULT_SIM_STALE_AFTER_DAYS = 7;

/**
 * simStaleAfterDays absent : la valeur enregistrée est conservée (défaut de
 * la colonne à la création), pour les clients qui ne l'envoient pas encore.
 */
async function upsertValidationSettings(realmId, settings) {
  const { allowedFightStyles, fightLength, enemyCount, raidBuffsConfig } = settings;
  const simStaleAfterDays = settings.simStaleAfterDays ?? null;
  const result = await prisma.$queryRaw`
    INSERT INTO validation_settings ("realmId", "allowedFightStyles", "fightLength", "enemyCount", "raidBuffsConfig", "simStaleAfterDays", "createdAt", "updatedAt")
    VALUES (${realmId}, ${allowedFightStyles}, ${fightLength}, ${enemyCount}, ${JSON.stringify(raidBuffsConfig)}::jsonb, COALESCE(${simStaleAfterDays}::int, ${DEFAULT_SIM_STALE_AFTER_DAYS}::int), NOW(), NOW())
    ON CONFLICT ("realmId")
    DO UPDATE SET
      "allowedFightStyles" = EXCLUDED."allowedFightStyles",
      "fightLength" = EXCLUDED."fightLength",
      "enemyCount" = EXCLUDED."enemyCount",
      "raidBuffsConfig" = EXCLUDED."raidBuffsConfig",
      "simStaleAfterDays" = COALESCE(${simStaleAfterDays}::int, validation_settings."simStaleAfterDays"),
      "updatedAt" = NOW()
    RETURNING *
  `;
  return result[0];
}

module.exports = {
  getValidationSettings,
  createValidationSettings,
  updateValidationSettings,
  upsertValidationSettings,
};
