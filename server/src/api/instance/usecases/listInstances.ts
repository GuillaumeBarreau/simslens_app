import { InstanceNotFoundError } from '../instance.errors';
import instanceRepository from '../instance.repository';
import type { InstanceEntity } from '../instance.types';

export async function listInstances(realmId: number | null = null): Promise<InstanceEntity[]> {
  return instanceRepository.listInstances(realmId);
}

/**
 * @throws {InstanceNotFoundError} si l'instance n'existe pas
 */
export async function getInstance(id: number): Promise<InstanceEntity> {
  const instance = await instanceRepository.findInstanceById(id);
  if (!instance) throw new InstanceNotFoundError();

  return instance;
}
