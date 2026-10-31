/**
 * Services externes propres à une instance (SIMS-286).
 *
 * Les identifiants viennent des variables de build (`VITE_DISCORD_CLIENT_ID`) :
 * un fork ne pointe ainsi vers aucun service du mainteneur.
 * Valeur vide ou absente = fonctionnalité désactivée.
 */

const normalize = (value: string | undefined): string => value?.trim() ?? '';

/** Lien d'invitation du bot Discord, ou `null` si aucun `client_id` n'est configuré. */
export function buildDiscordBotInviteUrl(clientId: string | undefined): string | null {
  const value = normalize(clientId);
  if (!value) return null;
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(value)}`;
}
