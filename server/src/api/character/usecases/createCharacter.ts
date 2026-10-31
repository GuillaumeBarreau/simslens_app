import { getCharacterEnrichedData } from '../../../integrations/blizzard/api';
import { CharacterAlreadyExistsError, CharacterValidationError } from '../character.errors';
import repo from '../character.repository';
import type {
  BlizzardCharacterData,
  CharacterOutput,
  CreateCharacterInput,
} from '../character.types';
import { requireSpecializationInClass, resolveCharacterClass } from '../resolveSpecialization';

/**
 * @throws {UnknownCharacterClassError} classe inconnue après normalisation
 * @throws {InvalidSpecializationError} spé (nom ou id) hors de la classe
 * @throws {CharacterAlreadyExistsError} nom déjà pris sur ce serveur
 */
export async function createCharacter(input: CreateCharacterInput): Promise<CharacterOutput> {
  if (!input.name || !input.class || !input.realm) {
    throw new CharacterValidationError('name, class, realm et spec sont obligatoires', [
      'name, class, realm et spec sont obligatoires',
    ]);
  }

  if (input.name.length < 2) {
    throw new CharacterValidationError('Le nom doit contenir au moins 2 caractères', [
      'Le nom doit contenir au moins 2 caractères',
    ]);
  }

  // Classe et spé avant l'appel Blizzard : une saisie incohérente est refusée
  // tout de suite (SIMS-213).
  const characterClass = await resolveCharacterClass(input.class);
  const specRequest = input.specializationId ?? input.spec;
  const specialization =
    specRequest !== undefined && specRequest !== null && specRequest !== ''
      ? requireSpecializationInClass(characterClass, specRequest)
      : null;

  const existing = await repo.findCharacterIdByNameAndRealm(input.name, input.realm);
  if (existing) {
    throw new CharacterAlreadyExistsError(input.name, input.realm);
  }
  let blizzardData: BlizzardCharacterData = {
    currentPeriodKeyCount: 0,
    ilvl: 0,
    score: 0,
    ManaforgeBuff: '0',
    thumbnail: null,
  };

  try {
    blizzardData = await getCharacterEnrichedData(input.region || 'EU', input.realm, input.name);
  } catch (apiErr: unknown) {
    const err = apiErr as { response?: { status?: number }; message?: string };
    if (err?.response?.status === 404) {
      console.warn(`Blizzard API returned 404 for ${input.name} (${input.realm}) - using defaults`);
    } else {
      console.error(`Blizzard API error for ${input.name} (${input.realm}):`, err?.message);
      throw apiErr;
    }
  }

  const payload = {
    name: input.name,
    class: characterClass.name,
    realm: input.realm,
    // spec et specializationId écrits ensemble, null sans spé
    spec: specialization?.name ?? null,
    specializationId: specialization?.id ?? null,
    region: (input.region || 'EU').toUpperCase(),
    thumbnail: blizzardData.thumbnail || null,
    lastModified: Date.now(),
    currentPeriodKeyCount: blizzardData.currentPeriodKeyCount || 0,
    ilvl: blizzardData.ilvl || 0,
    score: blizzardData.score || 0,
    ManaforgeBuff: String(blizzardData.ManaforgeBuff || 0),
    discordTag: input.discordTag || '',
  };

  const id = await repo.createCharacter(payload);

  return {
    id,
    ...payload,
    archived: 0,
    archivedAt: null,
    realmId: null,
    userId: null,
    status: 'approved',
    lastModified: new Date(payload.lastModified),
    message: `${input.name} a été ajouté au roster`,
  } as CharacterOutput;
}
