const { RAID_ROLES: ROLE_KEYS } = require('../../shared/constants/roles');
const { BUFF_PROVIDERS, providesBuff } = require('./composition.constants');

/**
 * Sélection par couverture des buffs de raid, sans accès à la base.
 *
 * Partagée par la composition automatique (composition.service) et la
 * suggestion de remplaçants (roster.replacements, SIMS-142).
 */

/**
 * Buffs actifs d'un royaume, d'après `validation_settings.raidBuffsConfig`.
 * Un buff absent de la configuration est actif, sauf `powerInfusion`.
 *
 * @param {Record<string, boolean> | null | undefined} raidBuffsConfig
 * @returns {{ key: string, providers: string[], enabled: boolean }[]} tous les buffs
 */
function resolveBuffs(raidBuffsConfig) {
  const cfg = raidBuffsConfig || {};
  return Object.entries(BUFF_PROVIDERS).map(([key, providers]) => ({
    key,
    providers,
    enabled: cfg[key] === undefined ? key !== 'powerInfusion' : !!cfg[key],
  }));
}

/**
 * Phase A — buff coverage. Force-pick a class provider per uncovered active
 * buff (highest score within that class). Records a warning if no candidate
 * is eligible.
 */
function selectForBuffs({
  bossId,
  candidatesByRole,
  selected,
  selectedClasses,
  roleTargets,
  roleFilled,
  scoredByCandidateId,
  activeBuffs,
  warnings,
}) {
  for (const buff of activeBuffs) {
    const alreadyCovered = [...selectedClasses].some((c) => providesBuff(buff.classes, c));
    if (alreadyCovered) continue;

    let best = null;
    let bestScore = -Infinity;
    let bestRole = null;
    let bestIsPrimary = false;
    for (const role of ROLE_KEYS) {
      if (roleFilled[role] >= roleTargets[role]) continue;
      for (const cand of candidatesByRole[role] || []) {
        if (selected.has(cand.characterId)) continue;
        if (!providesBuff(buff.classes, cand.class)) continue;
        const score = scoredByCandidateId.get(cand.characterId) || 0;
        if (
          (cand.isPrimaryRole && !bestIsPrimary) ||
          (cand.isPrimaryRole === bestIsPrimary && score > bestScore)
        ) {
          bestScore = score;
          best = cand;
          bestRole = role;
          bestIsPrimary = cand.isPrimaryRole;
        }
      }
    }

    if (best) {
      selected.set(best.characterId, {
        candidate: best,
        role: bestRole,
        reason: bestIsPrimary ? `buff:${buff.key}` : `buff:${buff.key}:offspec`,
      });
      selectedClasses.add(best.class);
      roleFilled[bestRole] = (roleFilled[bestRole] || 0) + 1;
    } else {
      warnings.push({ type: 'buff_uncovered', buff: buff.key, bossId });
    }
  }
}

module.exports = { resolveBuffs, selectForBuffs };
