/**
 * Spécialisation lue chez Blizzard (SIMS-208).
 *
 * Le claim, l'import de guilde et les synchronisations Blizzard posent la spé
 * d'après `active_spec` (nom anglais, l'API est appelée en locale en_GB).
 *
 * Règle validée par le mainteneur : la synchro **ne remplit que les spés
 * vides**. Une spé choisie à la main par un officier n'est jamais écrasée.
 * « Vide » : `specializationId` null et `spec` null, '' ou l'ancien littéral
 * 'dps' (personnages créés avant SIMS-208).
 *
 * Rien ici ne lève : une spé introuvable donne `null` et un log, jamais une
 * erreur qui ferait échouer la sync ou le claim.
 */

import characterRepository from './character.repository';
import {
  type ClassSpecialization,
  findSpecializationInClass,
  resolveCharacterClass,
} from './resolveSpecialization';

interface CharacterSpecializationFields {
  spec?: string | null;
  specializationId?: number | null;
}

export function isSpecializationEmpty(character: CharacterSpecializationFields): boolean {
  if (character.specializationId != null) return false;
  const spec = character.spec?.trim().toLowerCase() ?? '';
  return spec === '' || spec === 'dps';
}

export async function findBlizzardSpecialization(
  className: string | null | undefined,
  activeSpec: string | null | undefined,
): Promise<ClassSpecialization | null> {
  if (!activeSpec?.trim()) return null;
  try {
    const characterClass = await resolveCharacterClass(className);
    const specialization = findSpecializationInClass(characterClass, activeSpec);
    if (!specialization) {
      console.warn(
        `[Blizzard spec] Spé « ${activeSpec} » inconnue pour la classe ${characterClass.name}`,
      );
    }
    return specialization;
  } catch (err) {
    console.warn(
      `[Blizzard spec] Spé « ${activeSpec} » non résolue (classe ${className ?? 'absente'}) :`,
      (err as Error).message,
    );
    return null;
  }
}

/**
 * Pose la spé active Blizzard sur le personnage si sa spé est vide (la
 * condition est vérifiée dans la requête d'écriture).
 */
export async function fillSpecializationFromBlizzard(
  characterId: number,
  className: string | null | undefined,
  activeSpec: string | null | undefined,
): Promise<boolean> {
  try {
    const specialization = await findBlizzardSpecialization(className, activeSpec);
    if (!specialization) return false;
    return await characterRepository.fillSpecializationIfEmpty(characterId, {
      spec: specialization.name,
      specializationId: specialization.id,
    });
  } catch (err) {
    console.error(
      `[Blizzard spec] Échec de l'écriture de la spé du personnage ${characterId} :`,
      (err as Error).message,
    );
    return false;
  }
}
