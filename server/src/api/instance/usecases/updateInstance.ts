import { assertInstanceInRealm } from '../instance.access';
import { EmptyInstanceUpdateError, InstanceIdRequiredError } from '../instance.errors';
import instanceRepository from '../instance.repository';
import type { InstanceEntity, UpdateInstanceInput } from '../instance.types';

/**
 * @throws {InstanceNotFoundError} si l'instance n'existe pas ou sort du royaume
 */
export async function updateInstance(
  id: number,
  fields: UpdateInstanceInput,
  realmId: number,
): Promise<InstanceEntity | null> {
  if (!id) {
    throw new InstanceIdRequiredError();
  }

  if (!fields || Object.keys(fields).length === 0) {
    throw new EmptyInstanceUpdateError();
  }

  await assertInstanceInRealm(id, realmId);

  await instanceRepository.updateInstanceById(id, fields);

  return instanceRepository.findInstanceById(id);
}

/**
 * @throws {InstanceNotFoundError} si l'instance n'existe pas ou sort du royaume
 */
export async function deleteInstance(id: number, realmId: number): Promise<void> {
  if (!id) {
    throw new InstanceIdRequiredError();
  }

  await assertInstanceInRealm(id, realmId);

  await instanceRepository.deleteInstanceById(id);
}
