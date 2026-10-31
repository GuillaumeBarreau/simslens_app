import type { TokenEntity, TokenReward } from './item_tokens.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const tokenRepository: {
  isToken(itemId: number): Promise<boolean>;
  getTokenRewards(tokenItemId: number): Promise<TokenReward[]>;
  getAllTokens(): Promise<TokenEntity[]>;
  getById(id: number): Promise<TokenEntity | null>;
  create(data: unknown): Promise<unknown>;
  delete(id: number): Promise<unknown>;
};

export default tokenRepository;
