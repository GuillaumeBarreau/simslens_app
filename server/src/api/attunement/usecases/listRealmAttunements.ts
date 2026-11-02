import { ATTUNEMENTS } from '../attunement.definitions';
import attunementRepository from '../attunement.repository';
import { attunementStatus } from '../attunement.rules';
import type { CharacterAttunements } from '../attunement.types';

/** État de chaque attunement pour chaque personnage actif du royaume. */
export async function listRealmAttunements(realmId: number): Promise<CharacterAttunements[]> {
  const characters = await attunementRepository.listRealmCharacters(realmId);
  return characters.map((c) => ({
    characterId: c.id,
    name: c.name,
    class: c.class,
    attunements: Object.values(ATTUNEMENTS).map((definition) =>
      attunementStatus(
        definition,
        c.attunements.find((row) => row.attunement === definition.key),
      ),
    ),
  }));
}
