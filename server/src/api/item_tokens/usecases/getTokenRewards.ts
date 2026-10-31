/**
 * Un « token » est un objet de raid échangeable contre une pièce
 * d'équipement propre à la classe du joueur.
 */

import tokenRepository from '../item_tokens.repository';
import type { TokenEntity, TokenReward } from '../item_tokens.types';

export async function getTokenRewards(tokenItemId: number): Promise<TokenReward[]> {
  return tokenRepository.getTokenRewards(tokenItemId);
}

/**
 * Un échec de lecture répond « non » plutôt que de remonter : l'appelant
 * affiche une pastille indicative, pas une information critique.
 */
export async function isToken(itemId: number): Promise<boolean> {
  try {
    return await tokenRepository.isToken(itemId);
  } catch (error) {
    console.error('Error checking if item is token:', error);
    return false;
  }
}

export async function listAllTokens(): Promise<TokenEntity[]> {
  return tokenRepository.getAllTokens();
}
