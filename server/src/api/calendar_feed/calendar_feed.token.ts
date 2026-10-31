/**
 * Jeton du flux iCal (SIMS-204).
 *
 * Le jeton est le seul secret de l'URL du flux : 32 octets aléatoires
 * (256 bits), encodés en base64url pour tenir dans une URL. Seul son SHA-256
 * est stocké ; une fuite de la base ne donne accès à aucun flux.
 */

import { createHash, randomBytes } from 'node:crypto';

/** Octets aléatoires d'un jeton : 43 caractères en base64url. */
const TOKEN_BYTES = 32;

/** Extension acceptée en fin d'URL, que certains clients exigent. */
const ICS_EXTENSION = '.ics';

export function generateFeedToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashFeedToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Jeton contenu dans le dernier segment de l'URL, sans l'extension `.ics`. */
export function tokenFromFileName(fileName: string): string {
  return fileName.endsWith(ICS_EXTENSION) ? fileName.slice(0, -ICS_EXTENSION.length) : fileName;
}
