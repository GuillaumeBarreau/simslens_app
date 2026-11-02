import { forever } from 'config/games/forever';
import type { AttunementStatus, CharacterAttunements } from 'services/attunement.service';

/** Lien Wowhead Forever d'une quête : `https://www.wowhead.com/forever/quest=<id>`. */
export function wowheadQuestUrl(questId: number, baseUrl: string = forever.wowheadBaseUrl): string {
  return `${baseUrl}quest=${questId}`;
}

export function statusOf(
  character: CharacterAttunements,
  attunement: string,
): AttunementStatus | undefined {
  return character.attunements.find((a) => a.attunement === attunement);
}

/** Avancement entre 0 et 1 ; -1 tant que la faction n'est pas choisie. */
export function progressOf(status: AttunementStatus | undefined): number {
  if (!status?.totalSteps) return -1;
  return status.completedSteps / status.totalSteps;
}

/** Les plus avancés d'abord, puis par nom. */
export function sortByProgress(
  characters: CharacterAttunements[],
  attunement: string,
): CharacterAttunements[] {
  return [...characters].sort(
    (a, b) =>
      progressOf(statusOf(b, attunement)) - progressOf(statusOf(a, attunement)) ||
      a.name.localeCompare(b.name),
  );
}

export function countReady(
  characters: CharacterAttunements[],
  attunement: string,
): { ready: number; total: number } {
  const ready = characters.filter((c) => statusOf(c, attunement)?.completed).length;
  return { ready, total: characters.length };
}

/**
 * La chaîne est séquentielle : cocher la quête `index` valide aussi les
 * précédentes, la décocher annule aussi les suivantes.
 */
export function stepsAfterToggle(index: number, checked: boolean): number {
  return checked ? index + 1 : index;
}
