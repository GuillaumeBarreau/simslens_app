import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

/**
 * Libellé et emoji de chaque classe, dans l'ordre du menu Discord (SIMS-026).
 * Les clés sont les noms normalisés de la table `classes` du serveur.
 *
 * Ce n'est PAS la liste des classes jouables : elle vient du serveur, selon le jeu
 * de la guilde (`GET /1/events/:eventId/playable-classes`). Cette table ne fait que
 * les présenter.
 */
export const CLASS_DISPLAY = [
  { value: 'warrior', label: 'Guerrier', emoji: '⚔️' },
  { value: 'paladin', label: 'Paladin', emoji: '🛡️' },
  { value: 'hunter', label: 'Chasseur', emoji: '🏹' },
  { value: 'rogue', label: 'Voleur', emoji: '🗡️' },
  { value: 'priest', label: 'Prêtre', emoji: '✨' },
  { value: 'shaman', label: 'Chaman', emoji: '⚡' },
  { value: 'mage', label: 'Mage', emoji: '🔥' },
  { value: 'warlock', label: 'Démoniste', emoji: '🌑' },
  { value: 'monk', label: 'Moine', emoji: '🥋' },
  { value: 'druid', label: 'Druide', emoji: '🌿' },
  { value: 'death_knight', label: 'Chevalier de la mort', emoji: '💀' },
  { value: 'demon_hunter', label: 'Chasseur de démons', emoji: '👿' },
  { value: 'evoker', label: 'Évocateur', emoji: '🐉' },
];

/** Emoji Unicode par classe, repli quand le serveur Discord n'a pas d'emoji dédié. */
export const CLASS_EMOJI = Object.fromEntries(CLASS_DISPLAY.map((c) => [c.value, c.emoji]));

/**
 * Classes proposées quand le serveur ne répond pas : les 13 classes Retail, comme
 * avant SIMS-026.
 */
export const DEFAULT_CLASSES = CLASS_DISPLAY.map((c) => c.value);

/** Discord limite un menu déroulant à 25 options. */
const MAX_SELECT_OPTIONS = 25;

/**
 * Options du menu « classe » pour une liste de classes jouables : ordre du menu
 * Discord pour les classes connues, puis les classes inconnues de la table (libellé
 * = nom normalisé, sans emoji) plutôt que de les perdre.
 *
 * @param {string[]} classes - Noms normalisés des classes jouables
 * @returns {{ value: string, label: string, emoji?: string }[]}
 */
export function classMenuOptions(classes) {
  const playable = new Set(classes);
  const known = CLASS_DISPLAY.filter((c) => playable.has(c.value));
  const knownValues = new Set(known.map((c) => c.value));
  const unknown = [...playable]
    .filter((value) => !knownValues.has(value))
    .map((value) => ({ value, label: value }));
  return [...known, ...unknown].slice(0, MAX_SELECT_OPTIONS);
}

/**
 * Menu « classe » de l'invitation d'un invité.
 *
 * @param {number|string} eventId
 * @param {string[]} classes - Noms normalisés des classes jouables
 * @returns {StringSelectMenuBuilder}
 */
export function buildClassSelect(eventId, classes) {
  const options = classMenuOptions(classes).map((option) => {
    const builder = new StringSelectMenuOptionBuilder()
      .setLabel(option.label)
      .setValue(option.value);
    return option.emoji ? builder.setEmoji(option.emoji) : builder;
  });

  return new StringSelectMenuBuilder()
    .setCustomId(`guest_class_${eventId}`)
    .setPlaceholder('Choisir une classe')
    .addOptions(options);
}

/**
 * Classes jouables du jeu de la guilde de l'événement, demandées au serveur. En cas
 * d'échec ou de réponse vide, repli sur les classes Retail (comportement d'avant).
 *
 * @param {{ get: Function }} http - Client HTTP (axios)
 * @param {{ serverApiUrl: string, token: string, eventId: number|string }} params
 * @returns {Promise<string[]>}
 */
export async function fetchPlayableClasses(http, { serverApiUrl, token, eventId }) {
  try {
    const resp = await http.get(`${serverApiUrl}/1/events/${eventId}/playable-classes`, {
      headers: { 'x-internal-token': token },
    });
    const classes = resp.data?.classes;
    if (Array.isArray(classes) && classes.length > 0) return classes;
    console.warn(`[Guest Class] No playable classes for event ${eventId}, using Retail list.`);
  } catch (err) {
    console.error(
      `[Guest Class] Failed to fetch playable classes for event ${eventId}:`,
      err.response?.data || err.message,
    );
  }
  return DEFAULT_CLASSES;
}
