import type { instances } from '@prisma/client';

export type InstanceEntity = instances;

export interface CreateInstanceInput {
  name: InstanceEntity['name'];
  date: Date;
  raidDifficultyId: InstanceEntity['raidDifficultyId'];
  realmId?: InstanceEntity['realmId'];
  createdBy?: InstanceEntity['createdBy'];
  status?: InstanceEntity['status'];
  totalBosses?: InstanceEntity['totalBosses'];
  /** Boss à initialiser ; déduits de la difficulté si absents. */
  bossIds?: number[];
}

export interface UpdateInstanceInput {
  name?: InstanceEntity['name'];
  date?: Date;
  raidDifficultyId?: InstanceEntity['raidDifficultyId'];
  status?: InstanceEntity['status'];
  bossesKilled?: InstanceEntity['bossesKilled'];
  totalBosses?: InstanceEntity['totalBosses'];
}
