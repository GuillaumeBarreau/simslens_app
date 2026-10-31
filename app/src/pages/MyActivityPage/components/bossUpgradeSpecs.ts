import type { CharacterBossUpgrades } from 'services/character.service';

/** Spé choisie dans le sélecteur, mémorisée pour un personnage (SIMS-211). */
export interface BossUpgradeSpecChoice {
  characterId: number;
  specializationId: number;
}

/**
 * Spé à demander au serveur : celle choisie pour ce personnage, sinon la spé
 * par défaut (principale). Un choix fait pour un autre personnage est ignoré.
 */
export function requestedSpecializationId(
  choice: BossUpgradeSpecChoice | null,
  characterId: number | null,
  defaultSpecializationId: number | null,
): number | null {
  if (choice && choice.characterId === characterId) return choice.specializationId;
  return defaultSpecializationId;
}

/**
 * Options du sélecteur : les spés qui ont des sims, et la spé retenue même si
 * elle n'en a pas (spé principale jamais simulée), en tête.
 */
export function bossUpgradeSpecOptions(
  data: Pick<CharacterBossUpgrades, 'specialization' | 'specializations'> | undefined,
): { value: string; label: string }[] {
  if (!data) return [];
  const specs = [...data.specializations];
  if (data.specialization && !specs.some((s) => s.id === data.specialization?.id)) {
    specs.unshift(data.specialization);
  }
  return specs.map((s) => ({ value: String(s.id), label: s.name }));
}
