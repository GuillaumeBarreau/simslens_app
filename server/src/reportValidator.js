const e = require('express');

const NEW_TITLE_FORMAT_REGEX = /^Droptimizer\s*[•·]\s*.+\s*[•·]\s*(Mythic|Heroic|Normal|LFR)/i;

exports.validateReportProgressMaxed = (reportName) => {
  const messages = [];
  if (!reportName) {
    messages.push('Nom du rapport non disponible');
    return { valid: false, message: messages[0], messages };
  }
  console.log(`Validating report progress for report name: ${reportName}`);

  if (NEW_TITLE_FORMAT_REGEX.test(reportName)) {
    return {
      valid: true,
      message: 'Nouveau format de rapport — validation par structure des items',
      messages: [],
    };
  }

  const progressRegex = /(\d+)\/(\d+)$/;
  const match = reportName.match(progressRegex);
  if (!match) {
    messages.push('Format de progression non reconnu dans le nom du rapport');
    return { valid: false, message: messages[0], messages };
  }
  const current = parseInt(match[1]);
  const max = parseInt(match[2]);
  if (current !== max) {
    messages.push(
      `Le rapport n'est pas au niveau maximum (${current}/${max}). Veuillez mettre à jour le rapport pour inclure tous les upgrades (${max}/${max}).`,
    );
    return { valid: false, message: messages[0], messages };
  }
  return { valid: true, message: `Rapport validé au niveau maximum (${max}/${max})`, messages: [] };
};

const SLOT_LABELS = {
  head: 'Tête',
  neck: 'Cou',
  shoulder: 'Épaules',
  back: 'Cape',
  chest: 'Torse',
  wrist: 'Poignets',
  hands: 'Mains',
  waist: 'Ceinture',
  legs: 'Jambes',
  feet: 'Pieds',
  finger1: 'Anneau 1',
  finger2: 'Anneau 2',
  trinket1: 'Bijou 1',
  trinket2: 'Bijou 2',
  mainHand: 'Arme principale',
  offHand: 'Arme secondaire',
};

exports.validateUpgradeRanksMaxed = (items) => {
  if (!items || typeof items !== 'object') {
    console.warn('[Validator] No items data in report — skipping upgrade rank check');
    return { valid: true, message: 'Items non disponibles dans le rapport', messages: [] };
  }

  const nonMaxed = [];
  for (const [slot, data] of Object.entries(items)) {
    const upgrade = data?.upgrade;
    if (!upgrade) continue;
    const level = typeof upgrade.level === 'number' ? upgrade.level : null;
    const max = typeof upgrade.max === 'number' ? upgrade.max : null;
    if (level === null || max === null) continue;
    if (level < max) {
      nonMaxed.push({
        slot,
        label: SLOT_LABELS[slot] || slot,
        level,
        max,
        track: upgrade.name || null,
      });
    }
  }

  if (nonMaxed.length === 0) {
    return { valid: true, message: 'Tous les items sont au rang maximum', messages: [] };
  }

  const details = nonMaxed
    .map((i) => `${i.label} (${i.track ? `${i.track} ` : ''}${i.level}/${i.max})`)
    .join(', ');
  const message = `Le rapport n'est pas au niveau maximum. Slots concernés: ${details}. Veuillez mettre à jour le rapport pour inclure tous les upgrades.`;
  return { valid: false, message, messages: [message], nonMaxed };
};

exports.isPlayerAllowed = function (player) {
  const players = [];

  return players.includes(player);
};

exports.validateFightStyle = (fightStyle, allowedStyles = ['Patchwerk']) => {
  const validStyles = allowedStyles;
  const messages = [];
  if (!validStyles.includes(fightStyle)) {
    const stylesList = validStyles.join(', ');
    messages.push(
      `Le style de combat '${fightStyle}' n'est pas valide. Styles acceptés: ${stylesList}.`,
    );
    return { valid: false, message: messages[0], messages };
  }
  return { valid: true, message: 'Style de combat valide', messages: [] };
};

exports.validateFightLength = (fightLength, expectedLength = 300) => {
  const messages = [];
  if (fightLength !== expectedLength) {
    messages.push(
      `La durée du combat (${fightLength}) n'est pas valide. Le combat doit durer exactement ${expectedLength} secondes.`,
    );
    return { valid: false, message: messages[0], messages };
  }
  return { valid: true, message: 'Durée de combat valide', messages: [] };
};

exports.validateEnemyCount = (enemyCount, expectedCount = 1) => {
  const messages = [];
  if (enemyCount !== expectedCount) {
    messages.push(
      `Le nombre d'ennemis (${enemyCount}) n'est pas valide. Le rapport doit contenir exactement ${expectedCount} ennemi(s).`,
    );
    return { valid: false, message: messages[0], messages };
  }
  return { valid: true, message: "Nombre d'ennemis valide", messages: [] };
};

exports.validateRaidBuffsMeta = (meta, expectedConfig = null) => {
  const expected = expectedConfig || {
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
  };
  const messages = [];
  const errors = [];
  if (!meta || typeof meta !== 'object') {
    messages.push('meta object is missing or invalid');
    errors.push({ key: 'meta', reason: 'missing_or_invalid', expected });
    return { valid: false, message: messages[0], messages, errors };
  }

  const buffNames = {
    bloodlust: 'Bloodlust',
    arcaneIntellect: 'Arcane Intellect',
    fortitude: 'Fortitude',
    battleShout: 'Battle Shout',
    mysticTouch: 'Mystic Touch',
    chaosBrand: 'Chaos Brand',
    skyfury: 'Skyfury',
    markOfTheWild: 'Mark of the Wild',
    huntersMark: "Hunter's Mark",
    powerInfusion: 'Power Infusion',
  };

  Object.entries(expected).forEach(([key, expectedValue]) => {
    const friendlyName = buffNames[key] || key;

    if (!(key in meta)) {
      errors.push({ key, reason: 'missing', expected: expectedValue, actual: undefined });
      messages.push(`${friendlyName} is missing (expected ${expectedValue})`);
      return;
    }
    const actual = meta[key];
    if (typeof actual !== 'boolean') {
      errors.push({ key, reason: 'not_boolean', expected: expectedValue, actual });
      messages.push(`${friendlyName} must be boolean (got ${typeof actual})`);
      return;
    }
    if (actual !== expectedValue) {
      errors.push({ key, reason: 'mismatch', expected: expectedValue, actual });
      const status = expectedValue ? 'enabled' : 'disabled';
      messages.push(
        `${friendlyName} must be ${status} (currently ${actual ? 'enabled' : 'disabled'})`,
      );
    }
  });

  if (errors.length > 0) {
    const detailedMessage = `Raid buffs validation failed: ${messages[0]}`;
    return { valid: false, message: detailedMessage, messages, errors };
  }
  return { valid: true, message: 'Meta flags validated', messages: [], errors: [] };
};
