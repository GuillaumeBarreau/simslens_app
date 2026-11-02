/**
 * Registre des jeux (SIMS-020).
 *
 * SimsLens gère deux jeux : World of Warcraft Retail et WoW Forever. Chaque jeu est
 * décrit ici de façon déclarative ; le code partagé lit ce registre au lieu de
 * constantes propres à Retail, et les fonctionnalités propres à un jeu sont activées
 * par capacité (`hasCapability`). Voir docs/forever/README.md §7.
 *
 * `GameId` est défini ici, indépendamment du client Prisma : le registre doit pouvoir
 * être chargé sans base de données (scripts, tests).
 */

export const GAME_IDS = ['retail', 'forever'] as const;

export type GameId = (typeof GAME_IDS)[number];

/** Jeu par défaut : tout ce qui existait avant l'axe `game` est Retail. */
export const DEFAULT_GAME: GameId = 'retail';

export const GAME_CAPABILITIES = [
  // Retail
  'droptimizer',
  'mythicPlus',
  'raiderIo',
  'talentsApi',
  'simValidation',
  // Forever
  'bisLists',
  'attunements',
  'lootPriority',
  'softReserve',
  'raidWeekPlanner',
  'resistances',
] as const;

export type GameCapability = (typeof GAME_CAPABILITIES)[number];

/**
 * Spécialisation proposée par un jeu (SIMS-027). Les jeux partagent les lignes de la
 * table `specializations` (noms Retail, en anglais) : un jeu choisit lesquelles il
 * propose et sous quel libellé.
 */
export interface GameSpecialization {
  /** Nom normalisé de la classe (table `classes`). */
  className: string;
  /** Nom de la ligne `specializations` réutilisée (nom Retail). */
  specName: string;
  /** Libellé affiché pour ce jeu (anglais : le front le traduit). */
  label: string;
  /**
   * Rôle de raid propre à ce jeu (`tank`, `healer`, `melee`, `ranged`), quand il
   * diffère de celui de la ligne en base (SIMS-057). Absent : rôle de la base.
   */
  role?: string;
}

export interface GameDefinition {
  id: GameId;
  /** Classes jouables, noms normalisés de la table `classes` (`shared/constants/wow.js`). */
  playableClasses: readonly string[];
  /**
   * Spécialisations proposées et leur libellé. `null` : toutes les spécialisations
   * des classes jouables, libellé = nom en base.
   */
  specializations: readonly GameSpecialization[] | null;
  /**
   * Taille fixe de chaque raid, par nom de raid (`raids.name`). Vide : taille
   * flexible ou non décrite.
   */
  raidSizes: Readonly<Record<string, number>>;
  /** Difficultés de raid proposées. */
  difficulties: readonly string[];
  /** Valeurs de `extension` (raids, boss) qui relèvent de ce jeu. */
  extensions: readonly string[];
  /**
   * Valeurs de `season` connues. Pour Forever, ce sont les paliers (`tier-N`) dans
   * l'ordre. `null` : pas de liste figée, les saisons se lisent en base.
   */
  seasons: readonly string[] | null;
  /**
   * Suffixe du namespace Blizzard (`profile-<suffix>-eu`). Chaîne vide : pas de
   * suffixe (`profile-eu`). `null` : pas d'API Blizzard pour ce jeu.
   */
  blizzardNamespaceSuffix: string | null;
  capabilities: readonly GameCapability[];
}

/** Spé Retail réutilisée telle quelle (même libellé). */
function same(className: string, ...specNames: string[]): GameSpecialization[] {
  return specNames.map((specName) => ({ className, specName, label: specName }));
}

/**
 * Spécialisations de WoW Forever (SIMS-027) : les arbres vanilla des 9 classes,
 * portés par les lignes Retail correspondantes. Combat = Outlaw ; Combat farouche,
 * seul arbre du druide, couvre les deux rôles Retail (félin et ours).
 */
const FOREVER_SPECIALIZATIONS: readonly GameSpecialization[] = [
  ...same('warrior', 'Arms', 'Fury', 'Protection'),
  ...same('paladin', 'Holy', 'Protection', 'Retribution'),
  ...same('hunter', 'Beast Mastery', 'Marksmanship'),
  // Survie : arme à distance en vanilla, mêlée en Retail.
  { className: 'hunter', specName: 'Survival', label: 'Survival', role: 'ranged' },
  ...same('rogue', 'Assassination'),
  { className: 'rogue', specName: 'Outlaw', label: 'Combat' },
  ...same('rogue', 'Subtlety'),
  ...same('priest', 'Discipline', 'Holy', 'Shadow'),
  ...same('shaman', 'Elemental', 'Enhancement', 'Restoration'),
  ...same('mage', 'Arcane', 'Fire', 'Frost'),
  ...same('warlock', 'Affliction', 'Demonology', 'Destruction'),
  ...same('druid', 'Balance'),
  { className: 'druid', specName: 'Feral', label: 'Feral Combat (cat)' },
  { className: 'druid', specName: 'Guardian', label: 'Feral Combat (bear)' },
  ...same('druid', 'Restoration'),
];

export const GAMES: Readonly<Record<GameId, GameDefinition>> = {
  retail: {
    id: 'retail',
    playableClasses: [
      'warrior',
      'paladin',
      'hunter',
      'rogue',
      'priest',
      'death_knight',
      'shaman',
      'mage',
      'warlock',
      'monk',
      'druid',
      'demon_hunter',
      'evoker',
    ],
    specializations: null,
    raidSizes: {},
    difficulties: ['lfr', 'normal', 'heroic', 'mythic'],
    extensions: ['The-War-Within', 'Midnight'],
    seasons: null,
    blizzardNamespaceSuffix: '',
    capabilities: ['droptimizer', 'mythicPlus', 'raiderIo', 'talentsApi', 'simValidation'],
  },
  forever: {
    id: 'forever',
    playableClasses: [
      'warrior',
      'paladin',
      'hunter',
      'rogue',
      'priest',
      'shaman',
      'mage',
      'warlock',
      'druid',
    ],
    specializations: FOREVER_SPECIALIZATIONS,
    // Palier 1 (scripts/data/forever/raids.json) : taille fixe, pas de mode flexible.
    raidSizes: {
      'The Barrow Deeps': 10,
      'Hyjal Summit': 20,
      "Onyxia's Lair": 40,
    },
    difficulties: ['normal'],
    extensions: ['Forever'],
    seasons: ['tier-1'],
    // L'API Blizzard n'expose pas encore WoW Forever.
    blizzardNamespaceSuffix: null,
    capabilities: [
      'bisLists',
      'attunements',
      'lootPriority',
      'softReserve',
      'raidWeekPlanner',
      'resistances',
    ],
  },
};

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAME_IDS as readonly string[]).includes(value);
}

export function getGame(game: GameId): GameDefinition {
  return GAMES[game];
}

export function hasCapability(game: GameId, capability: GameCapability): boolean {
  return GAMES[game].capabilities.includes(capability);
}

/**
 * Libellé d'une spécialisation pour un jeu, ou `null` si le jeu ne la propose pas
 * (classe non jouable, spé absente de sa table).
 */
export function specializationLabel(
  game: GameId,
  className: string,
  specName: string,
): string | null {
  const definition = GAMES[game];
  if (!definition.playableClasses.includes(className)) return null;
  if (definition.specializations === null) return specName;
  const match = definition.specializations.find(
    (spec) => spec.className === className && spec.specName === specName,
  );
  return match ? match.label : null;
}

/**
 * Rôle d'une spécialisation pour un jeu : celui du registre s'il en décrit un,
 * sinon `defaultRole` (celui de la ligne en base).
 */
export function specializationRole(
  game: GameId,
  className: string,
  specName: string,
  defaultRole: string,
): string {
  const specs = GAMES[game].specializations;
  const match = specs?.find((spec) => spec.className === className && spec.specName === specName);
  return match?.role ?? defaultRole;
}

/** Taille fixe d'un raid pour un jeu, ou `null` si elle n'est pas décrite. */
export function raidSize(game: GameId, raidName: string): number | null {
  const sizes = GAMES[game].raidSizes;
  return Object.hasOwn(sizes, raidName) ? sizes[raidName] : null;
}

/**
 * Jeu d'un contenu d'après son `extension` (raids, boss) : `Forever` relève de WoW
 * Forever, tout le reste (y compris une extension absente) de Retail.
 */
export function gameFromExtension(extension?: string | null): GameId {
  return extension === 'Forever' ? 'forever' : 'retail';
}
