import type { CreateInstanceInput, InstanceEntity, UpdateInstanceInput } from './instance.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 *
 * Les alias getAll/getById/insert/updateById/removeById existent aussi dans
 * le module mais ne sont utilisés nulle part : ils ne sont pas déclarés ici.
 */
declare const instanceRepository: {
  listInstances(realmId?: number | null): Promise<InstanceEntity[]>;
  findInstanceById(id: number): Promise<InstanceEntity | null>;
  createInstance(data: CreateInstanceInput): Promise<number>;
  updateInstanceById(id: number, fields: UpdateInstanceInput): Promise<unknown>;
  deleteInstanceById(id: number): Promise<unknown>;
};

export default instanceRepository;
