import { InstanceNotFoundError } from './instance.errors';
import instanceRepository from './instance.repository';

/**
 * Rattache l'instance :id au royaume vérifié par checkPermission. Les routes
 * /instance/:id ne le font pas d'elles-mêmes : sans ce contrôle, un
 * gestionnaire d'un royaume modifierait l'instance d'un autre (SIMS-162).
 *
 * @throws {InstanceNotFoundError} si l'instance n'existe pas ou sort du royaume
 */
export async function assertInstanceInRealm(id: number, realmId: number): Promise<void> {
  const instance = await instanceRepository.findInstanceById(id);
  if (!instance || instance.realmId !== realmId) throw new InstanceNotFoundError();
}
