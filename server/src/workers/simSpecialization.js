/**
 * Spécialisation d'une sim (SIMS-210).
 *
 * Les rapports Raidbots et QuestionablyEpic donnent la spé sous forme de
 * libellé libre (`players[0].specialization` : « Elemental Shaman »,
 * « Beast Mastery Hunter » ; parfois le seul nom de spé). Ce module le
 * rapproche de `specializations`, **dans la classe du personnage** :
 * - casse, espaces autour et « _ » ignorés ;
 * - le libellé est soit le nom de la spé (« Elemental »), soit le nom de la spé
 *   suivi de celui de la classe (« Elemental Shaman », « Frost Death Knight »).
 *
 * Même règle que le rattrapage SQL de la migration
 * `20261012000000_link_sims_to_specializations`.
 *
 * En JavaScript pour être chargé par `require` depuis le worker (CommonJS),
 * comme `shared/utils/normalizeClass`. La classe est cherchée comme dans
 * `api/character/resolveSpecialization.ts` (classe normalisée, spés de la classe).
 *
 * Rien ici ne lève : une spé non reconnue donne `null` (et un log), jamais une
 * erreur qui ferait échouer l'import d'un rapport.
 */

const characterRepository = require('../api/character/character.repository');
const { normalizeClass } = require('../shared/utils/normalizeClass');

/**
 * @param {string} label
 * @returns {string} le libellé en minuscules, « _ » et espaces multiples ramenés à une espace
 */
function normalizeLabel(label) {
  return label.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Cherche la spé d'un libellé de sim dans une classe déjà chargée, sans accès
 * à la base.
 * @param {{ name: string, specializations: Array<{ id: number, name: string }> }} characterClass
 * @param {string | null | undefined} simSpec
 * @returns {{ id: number, name: string } | null} la spé, ou null si le libellé ne correspond à aucune spé de la classe
 */
function findSimSpecializationInClass(characterClass, simSpec) {
  const wanted = normalizeLabel(simSpec ?? '');
  if (!wanted) return null;
  const classLabel = normalizeLabel(characterClass.name);
  return (
    characterClass.specializations.find((s) => {
      const name = normalizeLabel(s.name);
      return wanted === name || wanted === `${name} ${classLabel}`;
    }) ?? null
  );
}

/**
 * Identifiant de la spé d'une sim pour un personnage de la classe donnée.
 * @param {string | null | undefined} className - classe du personnage (`characters.class`)
 * @param {string | null | undefined} simSpec - libellé de spé du rapport
 * @returns {Promise<number | null>} l'identifiant, ou null si la classe ou la spé est inconnue
 */
async function resolveSimSpecializationId(className, simSpec) {
  if (!simSpec?.trim()) return null;
  try {
    const characterClass = await characterRepository.findClassWithSpecializations(
      normalizeClass(className),
    );
    if (!characterClass) {
      console.warn(`[Sim spec] Classe « ${className ?? ''} » inconnue (spé « ${simSpec} »)`);
      return null;
    }
    const specialization = findSimSpecializationInClass(characterClass, simSpec);
    if (!specialization) {
      console.warn(`[Sim spec] Spé « ${simSpec} » inconnue pour la classe ${characterClass.name}`);
    }
    return specialization?.id ?? null;
  } catch (err) {
    console.warn(`[Sim spec] Spé « ${simSpec} » non résolue :`, err.message);
    return null;
  }
}

/**
 * Filtre des sims à remplacer quand un rapport est importé (SIMS-211).
 *
 * Spé résolue : on purge les sims de cette spé (`specializationId`), et les
 * anciennes lignes non rattachées dont le libellé est le même à la casse près.
 * Un même joueur qui a importé « Elemental Shaman » puis « elemental » n'a
 * ainsi plus deux jeux de sims parallèles pour la même spé.
 *
 * Spé non résolue : filtre historique sur le libellé exact (aucun filtre de
 * spé si `spec` est null ou absent).
 *
 * @param {{ characterId: number, difficulty: string, spec?: string | null, specializationId?: number | null }} params
 * @returns {object} le `where` de `prisma.upgrades.deleteMany`
 */
function upgradePurgeWhere({ characterId, difficulty, spec, specializationId }) {
  const where = { characterID: characterId, difficulty };
  if (specializationId == null) {
    if (spec != null) where.spec = spec;
    return where;
  }
  const sameSpec = [{ specializationId }];
  if (spec?.trim()) {
    sameSpec.push({
      specializationId: null,
      spec: { equals: spec.trim(), mode: 'insensitive' },
    });
  }
  where.OR = sameSpec;
  return where;
}

module.exports = { findSimSpecializationInClass, resolveSimSpecializationId, upgradePurgeWhere };
