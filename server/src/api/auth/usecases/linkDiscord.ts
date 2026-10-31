/**
 * Lie un compte Discord à un personnage du joueur connecté, par OAuth.
 *
 * Le personnage doit appartenir au joueur : sinon n'importe qui poserait son
 * pseudo Discord sur le personnage d'un autre, et le bot, qui reconnaît un
 * joueur à son pseudo, le traiterait comme ce personnage — inscriptions,
 * rôle de son propriétaire sur le royaume (SIMS-187).
 *
 * Les erreurs attendues ne lèvent pas : le flux OAuth répond par redirection,
 * le controller traduit `error` en `?discord_error=<code>`.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

import config from '../../../shared/config';
import characterRepo from '../../character/character.repository';

export type DiscordLinkError =
  'invalid_request' | 'not_configured' | 'token_exchange' | 'fetch_user';

type Failure = { ok: false; error: DiscordLinkError };

/** Données gardées en session entre le départ vers Discord et le retour. */
export interface DiscordLinkSession {
  characterId: number;
  userId: string;
  /** Jeton anti-CSRF envoyé à Discord et attendu au retour. */
  state: string;
}

/** Ce que le retour de Discord apporte, et qui l'apporte. */
export interface DiscordCallback {
  code: string;
  state: string;
  /** Joueur connecté au moment du retour. */
  sessionUserId: string | undefined;
}

/** Comparaison à temps constant ; faux si les longueurs diffèrent. */
function sameState(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** URL de retour enregistrée auprès de Discord. */
const callbackUrl = () => `${config.urls.server}/auth/discord/callback`;

/** Le personnage existe et appartient bien à ce joueur. */
async function isOwnCharacter(characterId: number, userId: string): Promise<boolean> {
  const character = await characterRepo.findCharacterById(characterId);
  return !!character?.userId && String(character.userId) === String(userId);
}

/**
 * Démarre la liaison : vérifie le personnage et construit l'URL d'autorisation
 * Discord. Un personnage d'un autre joueur donne `invalid_request`, comme un
 * personnage inexistant, sans révéler lequel des deux.
 */
export async function startDiscordLink(
  userId: string,
  characterId: number,
): Promise<{ ok: true; authorizeUrl: string; link: DiscordLinkSession } | Failure> {
  if (!config.discord.clientId) {
    console.error('❌ [Discord OAuth] DISCORD_CLIENT_ID is not configured');
    return { ok: false, error: 'not_configured' };
  }

  if (!(await isOwnCharacter(characterId, userId))) {
    return { ok: false, error: 'invalid_request' };
  }

  // Sans state, une page piégée enchaînerait départ (personnage de la victime)
  // et retour (code Discord de l'attaquant) dans le navigateur de la victime.
  const state = randomBytes(32).toString('hex');
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: callbackUrl(),
    response_type: 'code',
    scope: 'identify',
    state,
  });
  return {
    ok: true,
    authorizeUrl: `https://discord.com/oauth2/authorize?${params.toString()}`,
    link: { characterId, userId, state },
  };
}

/**
 * Termine la liaison au retour de Discord : échange le code, lit le pseudo et
 * l'enregistre sur le personnage.
 *
 * Avant tout appel à Discord : le state doit être celui émis au départ, le
 * joueur connecté celui qui a lancé le flux, et le personnage toujours le
 * sien (il a pu changer de mains pendant l'aller-retour).
 */
export async function completeDiscordLink(
  { code, state, sessionUserId }: DiscordCallback,
  link: DiscordLinkSession,
): Promise<{ ok: true; discordTag: string } | Failure> {
  if (!link.state || !sameState(link.state, state)) {
    console.error('❌ [Discord OAuth] State mismatch');
    return { ok: false, error: 'invalid_request' };
  }
  if (!sessionUserId || String(sessionUserId) !== String(link.userId)) {
    return { ok: false, error: 'invalid_request' };
  }

  if (!config.discord.clientId || !config.discord.clientSecret) {
    console.error('❌ [Discord OAuth] Discord credentials not configured');
    return { ok: false, error: 'not_configured' };
  }

  if (!(await isOwnCharacter(link.characterId, link.userId))) {
    return { ok: false, error: 'invalid_request' };
  }

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.discord.clientId,
      client_secret: config.discord.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl(),
    }).toString(),
  });
  if (!tokenResponse.ok) {
    console.error('❌ [Discord OAuth] Token exchange failed:', await tokenResponse.text());
    return { ok: false, error: 'token_exchange' };
  }
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userResponse.ok) {
    console.error('❌ [Discord OAuth] Failed to fetch Discord user');
    return { ok: false, error: 'fetch_user' };
  }
  const { username: discordTag } = (await userResponse.json()) as { username: string };

  await characterRepo.updateCharacterById(link.characterId, { discordTag });
  console.log(`✅ [Discord OAuth] Linked Discord "${discordTag}" to character ${link.characterId}`);

  return { ok: true, discordTag };
}
