import { CharacterNotFoundError } from './character.errors';
import characterRepository from './character.repository';

/**
 * Charge le personnage :id et le rattache au royaume vérifié par
 * checkPermission.
 *
 * checkPermission compare le royaume demandé à celui du personnage, mais laisse
 * passer un personnage sans royaume (créé hors guilde, ou retiré du roster) :
 * sans ce contrôle, un officier de n'importe quelle guilde le modifierait en
 * passant ?realmId=<sa guilde> (SIMS-161).
 *
 * @throws {CharacterNotFoundError} si le personnage n'existe pas ou sort du royaume
 */
export async function findCharacterInRealm(characterId: number, realmId: number) {
  const character = await characterRepository.findCharacterById(characterId);
  if (!character || character.realmId !== realmId) {
    throw new CharacterNotFoundError(characterId);
  }
  return character;
}
