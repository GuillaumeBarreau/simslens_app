/**
 * Codes et jetons de l'appairage d'appareil.
 *
 * Le code utilisateur est lu à voix haute ou recopié depuis un écran : son
 * alphabet exclut les caractères qui se confondent — I, O, 0 et 1 — et il
 * s'affiche en deux groupes de quatre.
 */

import crypto from 'node:crypto';

/** 32 caractères sans I, O, 0 ni 1. */
export const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const USER_CODE_LENGTH = 8;

/** Durée de validité d'un code d'appairage : le temps de le saisir. */
export const DEVICE_CODE_TTL_MS = 15 * 60 * 1000;

/** Durée de vie d'un jeton d'appareil : trois mois. */
export const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;
const DEVICE_CODE_BYTES = 32;

export function generateUserCode(): string {
  let out = '';
  for (let i = 0; i < USER_CODE_LENGTH; i++) {
    out += USER_CODE_ALPHABET[crypto.randomInt(0, USER_CODE_ALPHABET.length)];
  }

  return out;
}

export function generateDeviceCode(): string {
  return crypto.randomBytes(DEVICE_CODE_BYTES).toString('hex');
}

export function generateAccessToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Présentation à l'écran : ABCD-EFGH. Une valeur de longueur inattendue est
 * renvoyée telle quelle plutôt que tronquée.
 */
export function formatUserCode(raw: string): string {
  if (!raw || raw.length !== USER_CODE_LENGTH) return raw;

  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/**
 * Accepte ce que l'utilisateur tape : minuscules, tirets, espaces.
 */
export function normalizeUserCode(input: unknown): string {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}
