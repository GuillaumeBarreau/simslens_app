import type { BossRow } from './boss_listed.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const bossRepository: {
  listBosses(extension?: string, season?: string): Promise<BossRow[]>;
};

export default bossRepository;
