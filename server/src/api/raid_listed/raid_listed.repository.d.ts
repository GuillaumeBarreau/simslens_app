/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const raidRepository: {
  listAllRaidDifficultyPairs(extension?: string, season?: string): Promise<unknown[]>;
  getBossesByRaid(extension: string, season: string): Promise<unknown[]>;
};

export default raidRepository;
