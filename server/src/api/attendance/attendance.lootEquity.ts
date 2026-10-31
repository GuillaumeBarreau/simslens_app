/**
 * Équité du loot (SIMS-201) — calculs purs, testés sans base.
 *
 * Croise, pour chaque personnage du royaume et sur une période :
 *  - les objets reçus (historique importé de RCLootCouncil, `imported_loots`) ;
 *  - le gain de chaque objet : celui figé à l'import (SIMS-229) s'il existe,
 *    sinon une estimation, connue seulement si le dernier sim du joueur
 *    (`upgrades`, sans historique) date d'avant le drop ;
 *  - le taux de BiS rempli (`character_wishlists`) ;
 *  - la présence aux soirées (module attendance).
 *
 * Lecture seule : le vote reste dans l'addon. Le usecase
 * `getLootEquity` rassemble les données ; toute décision vit ici.
 */

import { resolveRole } from '../../shared/constants/roles';

export type RaidRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';

export interface EquityCharacter {
  id: number;
  name: string;
  class: string;
  thumbnail: string | null;
  specializationId: number | null;
  specName: string | null;
  specRole: string | null;
}

export interface EquityLoot {
  id: number;
  characterId: number;
  itemId: number | null;
  /** Date au format de l'addon (`jj/mm/aa`), telle qu'importée. */
  date: string | null;
  time: string | null;
  response: string | null;
  instance: string | null;
  /** Gain figé à l'import (SIMS-229) ; absent ou `null` pour un ancien drop. */
  frozenGainPercent?: number | null;
  frozenSimAt?: Date | null;
  /** Grandeur du gain figé (`dps` | `hps`) ; `null` vaut `dps`. */
  frozenMetric?: string | null;
}

export interface EquityItem {
  id: number;
  name: string;
  icon: string | null;
}

export interface EquitySim {
  characterId: number;
  itemId: number;
  dps: number;
  baseDps: number;
  timeStamp: Date;
  difficulty: string;
  /** Spé du rapport (`upgrades.spec`), parfois vide. */
  spec: string;
  /** Spé résolue (`upgrades.specializationId`, SIMS-210), si reconnue. */
  specializationId?: number | null;
  /**
   * Grandeur du sim (`upgrades.metric`, SIMS-202) : `hps` pour un rapport QE
   * Live de soigneur, `dps` (ou absente) sinon.
   */
  metric?: string | null;
}

/** Grandeur d'un gain (SIMS-202). */
export type GainMetric = 'dps' | 'hps';

/**
 * Grandeur d'un sim, ou d'un gain figé (SIMS-229) : toute valeur autre que
 * `hps`, y compris absente, vaut `dps`.
 */
export function gainMetricOf(sim: Pick<EquitySim, 'metric'>): GainMetric {
  return sim.metric === 'hps' ? 'hps' : 'dps';
}

/** Spé principale d'un personnage, par nom et par identifiant. */
export interface PrimarySpec {
  name: string | null;
  id?: number | null;
}

/** Origine du gain affiché : figé à l'import, ou estimé après coup. */
export type GainSource = 'frozen' | 'estimated';

export interface EquityWishlistEntry {
  characterId: number;
  specializationId: number;
  itemId: number;
}

export interface EquityTokenReward {
  tokenItemId: number;
  rewardItemId: number;
  class: string;
}

export interface EquityAttendance {
  characterId: number;
  present: number;
  totalRaids: number;
}

export interface LootEquityInput {
  range: { startDate: Date; endDate: Date };
  characters: EquityCharacter[];
  loots: EquityLoot[];
  items: EquityItem[];
  sims: EquitySim[];
  wishlists: EquityWishlistEntry[];
  tokenRewards: EquityTokenReward[];
  attendance: EquityAttendance[];
}

export interface LootEquityItem {
  lootId: number;
  itemId: number | null;
  itemName: string | null;
  itemIcon: string | null;
  receivedAt: string;
  response: string | null;
  instance: string | null;
  /**
   * Gain en % : figé à l'import, sinon estimé ; `null` sans sim antérieur au
   * drop (« inconnu »).
   */
  gainPercent: number | null;
  /** Grandeur de `gainPercent` : % de HPS (QE Live) ou de DPS ; null si inconnu. */
  gainMetric: GainMetric | null;
  simulatedAt: string | null;
  /** `null` quand le gain est inconnu. */
  gainSource: GainSource | null;
  isBis: boolean;
}

export interface LootEquityPlayer {
  characterId: number;
  name: string;
  class: string;
  spec: string | null;
  role: RaidRole;
  thumbnail: string | null;
  itemsReceived: number;
  items: LootEquityItem[];
  /**
   * Objets de la période dont le gain simulé est connu, dans la grandeur
   * `gainMetric` : ce sont eux que moyenne et cumul agrègent.
   */
  knownGainCount: number;
  /**
   * Grandeur des gains agrégés (SIMS-202) : celle du gain connu le plus
   * récent ; les gains d'une autre grandeur n'entrent pas dans la moyenne ni
   * le cumul (des % de HPS et de DPS ne s'additionnent pas). null sans gain.
   */
  gainMetric: GainMetric | null;
  averageGainPercent: number | null;
  cumulativeGainPercent: number | null;
  bisReceived: number;
  /** Objets de la wishlist (spé principale) obtenus à la fin de la période. */
  bisObtained: number;
  bisTotal: number;
  bisFillRate: number | null;
  present: number;
  totalRaids: number;
  presenceRate: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Borne de fin incluse : une date sans heure (`2026-10-10`, minuit UTC)
 * couvre toute la journée, sinon les drops du dernier soir seraient exclus.
 */
export function inclusiveEnd(endDate: Date): Date {
  return endDate.getTime() % MS_PER_DAY === 0
    ? new Date(endDate.getTime() + MS_PER_DAY - 1)
    : endDate;
}

/**
 * Date et heure d'un drop. L'addon écrit `jj/mm/aa` (ou `jj/mm/aaaa`) ; un
 * import CSV peut fournir `aaaa/mm/jj` ou `aaaa-mm-jj`. L'heure est celle du
 * client de jeu, lue en UTC faute de fuseau connu.
 *
 * @returns `null` pour une date absente ou illisible.
 */
export function parseLootDate(date: string | null, time: string | null): Date | null {
  if (!date) return null;
  const parts = date.trim().split(/[/.-]/);
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;

  let [day, month, year] = parts.map(Number);
  if (parts[0].length === 4) [year, month, day] = parts.map(Number);
  else if (parts[2].length === 2) year += 2000;

  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec((time ?? '').trim());
  const [hours, minutes, seconds] = timeMatch
    ? [Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3] ?? 0)]
    : [0, 0, 0];

  const parsed = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  // Rejette 31/02 et consorts, que Date.UTC décalerait au mois suivant.
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }
  return parsed;
}

/** Difficulté (`lfr`, `normal`, `heroic`, `mythic`) lue dans le libellé d'instance de l'addon. */
export function difficultyFromInstance(instance: string | null): string | null {
  const label = (instance ?? '').toLowerCase();
  if (!label) return null;
  if (label.includes('mythic') || label.includes('mythique')) return 'mythic';
  if (label.includes('heroic') || label.includes('héroïque')) return 'heroic';
  if (label.includes('raid finder') || label.includes('lfr') || label.includes('recherche')) {
    return 'lfr';
  }
  if (label.includes('normal')) return 'normal';
  return null;
}

/** Gain simulé en % ; `null` si la référence est inexploitable. */
export function percentGain(dps: number, baseDps: number): number | null {
  if (!Number.isFinite(dps) || !Number.isFinite(baseDps) || baseDps <= 0) return null;
  return ((dps - baseDps) / baseDps) * 100;
}

/**
 * Réponses RCLootCouncil qui ne donnent pas l'objet au joueur pour son
 * personnage : raisons d'attribution par défaut de l'addon (Disenchant,
 * Banking, Free) et leurs équivalents français, transmogrification, passes.
 * Comparées sans casse ni espaces de bord. Les boutons de réponse étant
 * configurables par guilde (`BiS`, `Upgrade`, `Off-spec`…), toute autre
 * valeur, ou une réponse absente, compte comme une attribution.
 */
export const NON_ATTRIBUTIVE_RESPONSES = [
  'disenchant',
  'désenchanter',
  'banking',
  'bank',
  'banque',
  'free',
  'transmog',
  'transmo',
  'pass',
  'autopass',
] as const;

export function isAttributiveResponse(response: string | null): boolean {
  const value = (response ?? '').trim().toLowerCase();
  return !(NON_ATTRIBUTIVE_RESPONSES as readonly string[]).includes(value);
}

/**
 * Le sim est-il de la spé principale du personnage ? Quand la spé du sim et
 * celle du personnage sont toutes deux résolues (SIMS-210), leurs
 * identifiants sont comparés. Sinon, le libellé du rapport (`Elemental
 * Shaman`, `Elemental`…) doit commencer par le nom de la spé. Sans l'une des
 * deux informations, la spé est ignorée.
 */
function matchesSpec(sim: EquitySim, primarySpec: string | null, primarySpecId: number | null) {
  if (sim.specializationId != null && primarySpecId != null) {
    return sim.specializationId === primarySpecId;
  }
  const label = sim.spec.trim().toLowerCase();
  const primary = (primarySpec ?? '').trim().toLowerCase();
  if (!label || !primary) return true;
  return label === primary || label.startsWith(`${primary} `);
}

/**
 * Sim retenu pour le gain d'un drop.
 *
 * `upgrades` ne garde pas d'historique : chaque import efface les sims
 * précédents du même (personnage, difficulté, spé), et seuls les gains
 * positifs sont enregistrés. Il existe donc au plus un sim par objet et par
 * (difficulté, spé) — le dernier. Il n'est retenu que s'il est :
 *  - de la difficulté du drop (inconnue → pas de gain) ;
 *  - de la spé principale du personnage, si l'information existe ;
 *  - antérieur au drop. Un sim postérieur mesurerait l'objet déjà porté.
 *    Sans date de drop (`null`), le sim courant est retenu.
 *
 * @returns `null` (gain « inconnu ») sinon.
 */
export function pickSimAtDrop(
  sims: EquitySim[],
  dropAt: Date | null,
  difficulty: string | null,
  primarySpec: string | null,
  primarySpecId: number | null = null,
): EquitySim | null {
  if (!difficulty) return null;
  const drop = dropAt ? dropAt.getTime() : Number.POSITIVE_INFINITY;
  const eligible = sims.filter(
    (s) =>
      percentGain(s.dps, s.baseDps) !== null &&
      s.difficulty === difficulty &&
      matchesSpec(s, primarySpec, primarySpecId) &&
      s.timeStamp.getTime() <= drop,
  );
  if (eligible.length === 0) return null;
  return eligible.reduce((best, s) => (s.timeStamp > best.timeStamp ? s : best));
}

/**
 * Grandeur dans laquelle agréger les gains d'un joueur (SIMS-202) : celle du
 * dernier objet reçu dont le gain est connu. Un soigneur passé d'un sim
 * Raidbots (DPS) à QE Live (HPS) n'additionne pas les deux.
 *
 * @param items objets du joueur, du plus ancien au plus récent
 */
export function aggregateGainMetric(
  items: Pick<LootEquityItem, 'gainMetric'>[],
): GainMetric | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const metric = items[i].gainMetric;
    if (metric) return metric;
  }
  return null;
}

/**
 * Objets de la wishlist de la spé principale ; toutes les spés si le
 * personnage n'en a pas.
 */
function wishlistOf(character: EquityCharacter, entries: EquityWishlistEntry[]): Set<number> {
  const own = entries.filter((e) => e.characterId === character.id);
  const primary =
    character.specializationId != null
      ? own.filter((e) => e.specializationId === character.specializationId)
      : own;
  return new Set(primary.map((e) => e.itemId));
}

interface LootGain {
  percent: number;
  metric: GainMetric;
  simulatedAt: Date | null;
  source: GainSource;
}

/**
 * Gain d'un drop : la valeur figée à l'import en priorité (SIMS-229), qu'un
 * sim ultérieur ne peut plus changer ; sinon, pour les drops importés avant,
 * l'estimation depuis le sim courant de l'objet ou des pièces du jeton.
 */
function gainOfLoot(
  loot: EquityLoot,
  at: Date,
  character: EquityCharacter,
  sims: EquitySim[],
  covered: Set<number>,
): LootGain | null {
  const frozen = loot.frozenGainPercent;
  if (frozen != null && Number.isFinite(frozen)) {
    return {
      percent: frozen,
      // Gain figé sans grandeur : vaut `dps`, comme un sim sans `metric`.
      metric: gainMetricOf({ metric: loot.frozenMetric }),
      simulatedAt: loot.frozenSimAt ?? null,
      source: 'frozen',
    };
  }

  const sim = pickSimAtDrop(
    sims.filter((s) => covered.has(s.itemId)),
    at,
    difficultyFromInstance(loot.instance),
    character.specName,
    character.specializationId,
  );
  const percent = sim ? percentGain(sim.dps, sim.baseDps) : null;
  if (!sim || percent === null) return null;
  return {
    percent,
    metric: gainMetricOf(sim),
    simulatedAt: sim.timeStamp,
    source: 'estimated',
  };
}

function groupBy<T>(rows: T[], key: (row: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Tableau d'équité : une ligne par personnage ayant reçu un objet ou été
 * attendu à une soirée sur la période. Les objets sans date lisible sont
 * écartés, faute de pouvoir les situer, comme ceux d'une réponse non
 * attributive (désenchantement, banque, transmog…).
 */
export function buildLootEquity(input: LootEquityInput): LootEquityPlayer[] {
  const start = input.range.startDate.getTime();
  const end = input.range.endDate.getTime();

  const itemsById = new Map(input.items.map((i) => [i.id, i]));
  const simsByCharacter = groupBy(input.sims, (s) => s.characterId);
  const lootsByCharacter = groupBy(input.loots, (l) => l.characterId);
  const attendanceByCharacter = new Map(input.attendance.map((a) => [a.characterId, a]));

  const rewardsByToken = new Map<number, EquityTokenReward[]>();
  for (const reward of input.tokenRewards) {
    rewardsByToken.set(reward.tokenItemId, [
      ...(rewardsByToken.get(reward.tokenItemId) ?? []),
      reward,
    ]);
  }

  /** L'objet lui-même et, pour un jeton, les pièces qu'il donne à cette classe. */
  const itemsCoveredBy = (itemId: number, characterClass: string): Set<number> =>
    new Set([
      itemId,
      ...(rewardsByToken.get(itemId) ?? [])
        .filter((r) => r.class === characterClass)
        .map((r) => r.rewardItemId),
    ]);

  const players: LootEquityPlayer[] = [];

  for (const character of input.characters) {
    const wishlist = wishlistOf(character, input.wishlists);
    const sims = simsByCharacter.get(character.id) ?? [];
    const attendance = attendanceByCharacter.get(character.id);

    const datedLoots = (lootsByCharacter.get(character.id) ?? [])
      .filter((loot) => isAttributiveResponse(loot.response))
      .map((loot) => ({ loot, at: parseLootDate(loot.date, loot.time) }))
      .filter((l): l is { loot: EquityLoot; at: Date } => l.at !== null)
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    const obtainedBis = new Set<number>();
    const items: LootEquityItem[] = [];

    for (const { loot, at } of datedLoots) {
      if (at.getTime() > end || loot.itemId == null) continue;

      const covered = itemsCoveredBy(loot.itemId, character.class);
      const bisHits = [...covered].filter((id) => wishlist.has(id));
      for (const id of bisHits) obtainedBis.add(id);

      if (at.getTime() < start) continue;

      const gain = gainOfLoot(loot, at, character, sims, covered);
      const item = itemsById.get(loot.itemId);

      items.push({
        lootId: loot.id,
        itemId: loot.itemId,
        itemName: item?.name ?? null,
        itemIcon: item?.icon ?? null,
        receivedAt: at.toISOString(),
        response: loot.response,
        instance: loot.instance,
        gainPercent: gain ? round(gain.percent, 2) : null,
        gainMetric: gain ? gain.metric : null,
        simulatedAt: gain?.simulatedAt ? gain.simulatedAt.toISOString() : null,
        gainSource: gain ? gain.source : null,
        isBis: bisHits.length > 0,
      });
    }

    const totalRaids = attendance?.totalRaids ?? 0;
    if (items.length === 0 && totalRaids === 0) continue;

    const gainMetric = aggregateGainMetric(items);
    const gains = items
      .filter((i) => i.gainMetric === gainMetric)
      .map((i) => i.gainPercent)
      .filter((g): g is number => g !== null);
    const cumulative = gains.reduce((sum, g) => sum + g, 0);
    const present = attendance?.present ?? 0;

    players.push({
      characterId: character.id,
      name: character.name,
      class: character.class,
      spec: character.specName,
      role: resolveRole(character.class, character.specName, character.specRole) as RaidRole,
      thumbnail: character.thumbnail,
      itemsReceived: items.length,
      items: items.reverse(),
      knownGainCount: gains.length,
      gainMetric,
      averageGainPercent: gains.length > 0 ? round(cumulative / gains.length, 2) : null,
      cumulativeGainPercent: gains.length > 0 ? round(cumulative, 2) : null,
      bisReceived: items.filter((i) => i.isBis).length,
      bisObtained: obtainedBis.size,
      bisTotal: wishlist.size,
      bisFillRate: wishlist.size > 0 ? round(obtainedBis.size / wishlist.size, 4) : null,
      present,
      totalRaids,
      presenceRate: totalRaids > 0 ? round(present / totalRaids, 4) : null,
    });
  }

  return players.sort((a, b) => a.name.localeCompare(b.name));
}
