/**
 * Spé de soin d'un rapport QE Live (SIMS-202).
 *
 * QE Live (QuestionablyEpic) ne simule que des soigneurs : ses gains sont des
 * HPS. Une sim QE est donc toujours rattachée à une **spé de soin** du
 * personnage, jamais à une spé DPS ou tank.
 *
 * Règle (`pickQEHealerSpecialization`) :
 * 1. Spé du rapport reconnue dans la classe :
 *    - pas une spé de soin → refus `QE_NOT_HEALER_SPEC` ;
 *    - sinon cette spé, **même si le personnage ne l'a pas déclarée** : la spé
 *      détectée dans le rapport est la seule correcte (comme SIMS-212). Un
 *      prêtre principal Ombre peut ainsi importer un QE Sacré.
 * 2. Spé du rapport absente ou non reconnue : la spé principale si c'est un
 *    soin, sinon la première off-spec de soin, sinon l'unique spé de soin de
 *    la classe. Sinon refus `QE_NO_HEALER_SPEC`.
 * Une classe sans spé de soin est refusée (`QE_NO_HEALER_SPEC`).
 *
 * Classe du personnage introuvable : rien n'est vérifiable, la sim est importée
 * sans spé (`null`), comme avant (SIMS-210).
 */

const { UnrecoverableError } = require('bullmq');
const characterRepository = require('../api/character/character.repository');
const { normalizeClass } = require('../shared/utils/normalizeClass');
const { findSimSpecializationInClass } = require('./simSpecialization');

const HEALER_ROLE = 'healer';

/**
 * Refus d'un import de rapport, avec un code stable que le front traduit.
 * Hérite de `UnrecoverableError` : BullMQ ne relance pas le job, réessayer
 * donnerait le même refus.
 */
class ReportImportError extends UnrecoverableError {
  /**
   * @param {string} code
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ReportImportError';
    this.code = code;
    this.details = details;
  }
}

/**
 * @typedef {{ id: number, name: string, role?: string | null }} ClassSpecialization
 * @typedef {{ name: string, specializations: ClassSpecialization[] }} CharacterClass
 */

/**
 * Choisit la spé de soin d'un rapport QE, sans accès à la base.
 * @param {{
 *   characterClass: CharacterClass | null,
 *   simSpec?: string | null,
 *   mainSpecializationId?: number | null,
 *   offSpecializationIds?: number[],
 * }} params
 * @returns {ClassSpecialization | null} la spé retenue ; null seulement si la classe est inconnue
 * @throws {ReportImportError} si le personnage n'a pas de spé de soin utilisable
 */
function pickQEHealerSpecialization({
  characterClass,
  simSpec,
  mainSpecializationId = null,
  offSpecializationIds = [],
}) {
  if (!characterClass) return null;

  const healerSpecs = characterClass.specializations.filter((s) => s.role === HEALER_ROLE);
  if (healerSpecs.length === 0) {
    throw new ReportImportError(
      'QE_NO_HEALER_SPEC',
      `QE Live report refused: class ${characterClass.name} has no healer specialization.`,
      { className: characterClass.name },
    );
  }

  const fromReport = findSimSpecializationInClass(characterClass, simSpec);

  if (fromReport) {
    if (fromReport.role !== HEALER_ROLE) {
      throw new ReportImportError(
        'QE_NOT_HEALER_SPEC',
        `QE Live report refused: ${fromReport.name} is not a healer specialization.`,
        { specialization: fromReport.name },
      );
    }
    // Spé de soin de la classe détectée dans le rapport : retenue même non
    // déclarée par le personnage.
    return fromReport;
  }

  const main = healerSpecs.find((s) => s.id === mainSpecializationId);
  if (main) return main;
  const offSpec = healerSpecs.find((s) => offSpecializationIds.includes(s.id));
  if (offSpec) return offSpec;
  if (healerSpecs.length === 1) return healerSpecs[0];

  throw new ReportImportError(
    'QE_NO_HEALER_SPEC',
    'QE Live report refused: the report specialization is unknown and no healer specialization can be deduced for this character (main, off-spec or single healer specialization of the class).',
    { className: characterClass.name },
  );
}

/**
 * Spé de soin d'un rapport QE pour un personnage.
 * @param {{ class: string, specializationId?: number | null, offspecs?: Array<{ specializationId: number }> }} character
 * @param {string | null | undefined} simSpec - libellé de spé du rapport (`report.spec`)
 * @returns {Promise<number | null>} l'identifiant de la spé ; null si la classe est inconnue
 * @throws {ReportImportError}
 */
async function resolveQEHealerSpecializationId(character, simSpec) {
  const characterClass = await characterRepository.findClassWithSpecializations(
    normalizeClass(character.class),
  );
  if (!characterClass) {
    console.warn(`[QE spec] Classe « ${character.class ?? ''} » inconnue (spé « ${simSpec} »)`);
  }
  const specialization = pickQEHealerSpecialization({
    characterClass,
    simSpec,
    mainSpecializationId: character.specializationId ?? null,
    offSpecializationIds: (character.offspecs ?? []).map((o) => o.specializationId),
  });
  return specialization?.id ?? null;
}

module.exports = {
  ReportImportError,
  pickQEHealerSpecialization,
  resolveQEHealerSpecializationId,
};
