import { getCharacterEnrichedData } from '../../../integrations/blizzard/api';
import { fillSpecializationFromBlizzard, isSpecializationEmpty } from '../blizzardSpecialization';
import repo from '../character.repository';
import type { UpdateAllCharactersOutput } from '../character.types';
import { syncAllCharacterKeyRuns } from './syncAllCharacterKeyRuns';

/** Motif d'un personnage introuvable chez Blizzard (détail renvoyé au front). */
export const BLIZZARD_NOT_FOUND = 'Blizzard API returned 404';

interface UpdateOptions {
  concurrency?: number;
  /** Royaume à mettre à jour ; tous les personnages sans (planificateur uniquement). */
  realmId?: number | null;
}

export async function updateAllCharacters(
  options: UpdateOptions = {},
): Promise<UpdateAllCharactersOutput> {
  const concurrency = options.concurrency || 3;

  const characters = await repo.listCharacters(options.realmId ?? undefined);
  console.log(`Starting update of ${characters.length} characters with concurrency ${concurrency}`);

  if (characters.length === 0) {
    console.warn('No characters found in database');
    return { updated: 0, failed: 0, details: [] };
  }

  const results: UpdateAllCharactersOutput = { updated: 0, failed: 0, details: [] };

  const queue = characters.slice();
  const workers = Array.from({ length: Math.max(1, concurrency) }).map(() =>
    workerUpdateCharacters(queue, results),
  );

  await Promise.all(workers);

  console.log(`Update finished: ${results.updated} updated, ${results.failed} failed`);

  // Sync key runs after the main update so currentPeriodKeyCount is up to date
  try {
    await syncAllCharacterKeyRuns();
  } catch (e: unknown) {
    console.error('Key sync failed after updateAllCharacters:', (e as Error).message);
  }

  return results;
}

async function workerUpdateCharacters(
  queue: Array<{
    id: number;
    name: string;
    realm: string;
    region?: string | null;
    class?: string | null;
    spec?: string | null;
    specializationId?: number | null;
  }>,
  results: UpdateAllCharactersOutput,
): Promise<void> {
  while (queue.length > 0) {
    const character = queue.shift();
    if (!character) continue;

    try {
      console.log(`Processing character: ${character.name} (${character.realm})`);

      let details;
      try {
        details = await getCharacterEnrichedData(
          character.region || 'eu',
          character.realm,
          character.name,
        );
      } catch (apiErr: unknown) {
        const err = apiErr as { response?: { status?: number } };
        if (err?.response?.status !== 404) throw apiErr;
        // Personnage renommé, transféré ou supprimé : rien n'est écrit (ilvl et score
        // conservés) et il compte une seule fois, comme un échec.
        console.warn(`Blizzard API returned 404 for ${character.name} (${character.realm})`);
        results.failed += 1;
        results.details.push({
          id: character.id,
          name: character.name,
          ok: false,
          error: BLIZZARD_NOT_FOUND,
        });
        continue;
      }

      const fields = {
        lastModified: new Date(),
        // currentPeriodKeyCount is managed exclusively by syncAllCharacterKeyRuns
        // (accumulated across multiple Raider.IO polls). Do NOT overwrite it here.
        ilvl: details.ilvl || 0,
        score: details.score || 0,
        ManaforgeBuff: String(details.ManaforgeBuff || 0),
        ...(details.thumbnail ? { thumbnail: details.thumbnail } : {}),
      };

      await repo.updateCharacterById(character.id, fields);
      // Spé vide uniquement : une spé choisie à la main n'est jamais écrasée (SIMS-208).
      if (isSpecializationEmpty(character)) {
        await fillSpecializationFromBlizzard(character.id, character.class, details.active_spec);
      }
      results.updated += 1;
      results.details.push({
        id: character.id,
        name: character.name,
        ok: true,
      });

      console.log(`Character updated: ${character.name} (${character.realm})`);
    } catch (err: unknown) {
      const error = err as Error;
      results.failed += 1;
      results.details.push({
        id: character.id,
        name: character.name,
        ok: false,
        error: error.message,
      });
      console.error(`Error updating ${character.name} (${character.realm}):`, error.message);
    }
  }
}
