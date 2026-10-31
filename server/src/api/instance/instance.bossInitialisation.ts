/**
 * Initialisation des boss d'une instance.
 *
 * ⚠️ Dette technique n°18 — le repository visé ici n'a jamais été
 * implémenté : `instance_boss_killed.repository` n'exporte que des stubs, et
 * `createInstanceBosses` n'y existe pas. Tout appel lève un TypeError, ce qui
 * casse la création d'instance dès que le raid comporte des boss.
 *
 * Le transtypage ci-dessous décrit la méthode telle qu'elle *devrait* être,
 * pour que la dette reste lisible à l'endroit où elle mord plutôt que d'être
 * masquée par un `any`.
 */

import instanceBossRepositoryModule from '../instance_boss_killed/instance_boss_killed.repository';

interface InstanceBossInitialiser {
  createInstanceBosses(instanceId: number, bossIds: number[]): Promise<unknown>;
}

export const instanceBossRepository =
  instanceBossRepositoryModule as unknown as InstanceBossInitialiser;
