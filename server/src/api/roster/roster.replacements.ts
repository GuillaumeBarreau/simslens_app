/**
 * Remplaçants d'un titulaire qui s'est désisté (SIMS-142).
 *
 * Purement calculatoire : getRosterReplacements rassemble les données, ce
 * fichier détecte les places vacantes et classe les remplaçants. La
 * couverture des buffs réutilise selectForBuffs, comme la composition
 * automatique.
 */

import { providesBuff } from '../composition/composition.constants';
import { gainMetricOf, normalizeWithinMetric } from '../composition/composition.gainScale';
import { selectForBuffs } from '../composition/composition.selection';
import { AVAILABLE_SIGNUP_STATUSES } from './roster.availability';

export type RaidRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';

export const WITHDRAWN_SIGNUP_STATUS = 'ABSENT';

/** Nombre de remplaçants proposés par place vacante. */
export const REPLACEMENT_LIMIT = 3;

/** Un buff actif du royaume et les classes qui l'apportent. */
export interface ActiveBuff {
  key: string;
  providers: string[];
}

/** Ce qu'un personnage peut gagner sur un boss. */
export interface BossNeed {
  /** Objets BiS de ce boss qui seraient une amélioration. */
  bisCount: number;
  /** Meilleur gain brut sur ce boss, dans la grandeur `metric`. */
  bestGain: number;
  /**
   * Grandeur de `bestGain` (SIMS-202) : `hps` pour une sim QE Live de
   * soigneur, `dps` (ou absente) sinon.
   */
  metric?: string | null;
}

export interface ReplacementCandidate {
  characterId: number;
  name: string;
  class: string;
  spec: string | null;
  /** true si le personnage n'a pas de spécialisation définie (SIMS-209). */
  missingSpecialization?: boolean;
  userId: string | null;
  /**
   * Rôle de sa spécialisation actuelle ; sans spécialisation, celui de son
   * inscription, ou null si rien ne le donne (il ne joue alors qu'en off-spec).
   */
  role: RaidRole | null;
  /** Rôles que sa classe peut tenir. */
  playableRoles: RaidRole[];
  /** Besoin par boss, indexé par identifiant de boss. */
  needByBoss: Map<number, BossNeed>;
}

/** Un titulaire placé sur un boss. */
export interface Holder {
  bossId: number;
  characterId: number;
  name: string;
  class: string | null;
  spec: string | null;
  userId: string | null;
  role: RaidRole;
}

export interface RankedReplacement {
  characterId: number;
  name: string;
  class: string;
  spec: string | null;
  /** true si le remplaçant n'a pas de spécialisation définie (SIMS-209). */
  missingSpecialization: boolean;
  /** false si le remplaçant joue la place en off-spec. */
  isPrimaryRole: boolean;
  /** Buffs perdus que ce remplaçant rendrait au raid. */
  coveredBuffs: string[];
  bisCount: number;
  bestGain: number;
  /** Grandeur de `bestGain` (SIMS-202). */
  metric: 'dps' | 'hps';
}

export interface Vacancy {
  bossId: number;
  characterId: number;
  characterName: string;
  class: string | null;
  spec: string | null;
  role: RaidRole;
  /** Buffs que le raid perd sur ce boss avec ce départ. */
  lostBuffs: string[];
  replacements: RankedReplacement[];
}

/**
 * Le membre s'est-il désisté ? Vrai s'il a passé une inscription en absent
 * et n'en a aucune autre qui le rende plaçable (il peut s'être inscrit avec
 * un autre personnage). Un membre jamais inscrit, placé à la main par un
 * officier, n'est pas un désistement.
 */
export function isWithdrawn(statuses: string[]): boolean {
  return (
    statuses.includes(WITHDRAWN_SIGNUP_STATUS) &&
    !statuses.some((s) => (AVAILABLE_SIGNUP_STATUSES as readonly string[]).includes(s))
  );
}

/**
 * Buffs que le raid perd quand `leaving` quitte le boss : ceux que sa classe
 * apporte et qu'aucun des titulaires restants n'apporte.
 */
export function lostBuffsOf(
  leavingClass: string | null,
  remainingClasses: Iterable<string | null>,
  activeBuffs: ActiveBuff[],
): string[] {
  if (!leavingClass) return [];
  const remaining = [...remainingClasses];
  return activeBuffs
    .filter((b) => providesBuff(b.providers, leavingClass))
    .filter((b) => !remaining.some((c) => providesBuff(b.providers, c)))
    .map((b) => b.key);
}

/**
 * Score de besoin, pour départager à rôle et buff égaux : les objets BiS
 * d'abord, le gain ensuite. `gainScale` est le gain ramené à [0, 1] parmi les
 * candidats de la même grandeur (SIMS-202) : des HPS ne sont jamais comparés
 * tels quels à des DPS.
 */
function needScore(need: BossNeed, gainScale: number): number {
  return need.bisCount * 1_000_000 + gainScale;
}

interface RankInput {
  vacancy: Pick<Holder, 'bossId' | 'class' | 'role'>;
  /** Titulaires qui restent sur ce boss. */
  remaining: Pick<Holder, 'characterId' | 'class' | 'userId'>[];
  candidates: ReplacementCandidate[];
  activeBuffs: ActiveBuff[];
  limit?: number;
}

/**
 * Classe les remplaçants d'une place vacante.
 *
 * 1. Seuls les personnages capables de tenir le rôle de la place, ni déjà
 *    placés sur ce boss, ni appartenant à un membre déjà placé, sont retenus.
 * 2. selectForBuffs désigne d'abord, pour chaque buff perdu, le meilleur
 *    fournisseur (spécialisation principale préférée).
 * 3. Les autres suivent : rôle principal, puis buff perdu rendu, puis besoin
 *    BiS, puis gain de DPS, puis nom.
 *
 * Un membre n'apparaît qu'une fois, avec son personnage le mieux classé.
 */
export function rankReplacements({
  vacancy,
  remaining,
  candidates,
  activeBuffs,
  limit = REPLACEMENT_LIMIT,
}: RankInput): RankedReplacement[] {
  const role = vacancy.role;
  const takenCharacters = new Set(remaining.map((h) => h.characterId));
  const takenUsers = new Set(remaining.map((h) => h.userId).filter(Boolean));
  const lostBuffs = lostBuffsOf(
    vacancy.class,
    remaining.map((h) => h.class),
    activeBuffs,
  );
  const lost = activeBuffs.filter((b) => lostBuffs.includes(b.key));

  const available = candidates
    .filter((c) => c.role === role || c.playableRoles.includes(role))
    .filter((c) => !takenCharacters.has(c.characterId))
    .filter((c) => !c.userId || !takenUsers.has(c.userId));
  const needs: BossNeed[] = available.map(
    (c) => c.needByBoss.get(vacancy.bossId) ?? { bisCount: 0, bestGain: 0 },
  );
  const gainScales: number[] = normalizeWithinMetric(
    needs.map((need) => need.bestGain),
    needs.map((need) => need.metric),
  );
  const eligible = available.map((c, i) => ({
    ...c,
    isPrimaryRole: c.role === role,
    need: needs[i],
    gainScale: gainScales[i],
    coveredBuffs: lost.filter((b) => providesBuff(b.providers, c.class)).map((b) => b.key),
  }));

  const scoredByCandidateId = new Map(
    eligible.map((c) => [c.characterId, needScore(c.need, c.gainScale)]),
  );
  const roleTargets = { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0, [role]: lost.length };
  const selected = new Map<number, unknown>();
  selectForBuffs({
    bossId: vacancy.bossId,
    candidatesByRole: { [role]: eligible },
    selected,
    selectedClasses: new Set(remaining.map((h) => h.class).filter(Boolean)),
    roleTargets,
    roleFilled: { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 },
    scoredByCandidateId,
    activeBuffs: lost.map((b) => ({ key: b.key, classes: b.providers })),
    warnings: [],
  });

  const buffPicks = [...selected.keys()];
  const rest = eligible
    .filter((c) => !selected.has(c.characterId))
    .sort(
      (a, b) =>
        Number(b.isPrimaryRole) - Number(a.isPrimaryRole) ||
        b.coveredBuffs.length - a.coveredBuffs.length ||
        b.need.bisCount - a.need.bisCount ||
        b.gainScale - a.gainScale ||
        a.name.localeCompare(b.name),
    );
  const ordered = [...buffPicks.map((id) => eligible.find((c) => c.characterId === id)!), ...rest];

  const seenUsers = new Set<string>();
  const result: RankedReplacement[] = [];
  for (const c of ordered) {
    if (result.length >= limit) break;
    if (c.userId) {
      if (seenUsers.has(c.userId)) continue;
      seenUsers.add(c.userId);
    }
    result.push({
      characterId: c.characterId,
      name: c.name,
      class: c.class,
      spec: c.spec,
      missingSpecialization: !!c.missingSpecialization,
      isPrimaryRole: c.isPrimaryRole,
      coveredBuffs: c.coveredBuffs,
      bisCount: c.need.bisCount,
      bestGain: c.need.bestGain,
      metric: gainMetricOf(c.need.metric),
    });
  }
  return result;
}

interface FindVacanciesInput {
  holders: Holder[];
  /** Statuts d'inscription de chaque titulaire, par identifiant de personnage. */
  statusesByCharacterId: Map<number, string[]>;
  candidates: ReplacementCandidate[];
  activeBuffs: ActiveBuff[];
}

/**
 * Places vacantes de l'événement, boss par boss, avec leurs remplaçants.
 * Les titulaires désistés d'un même boss sont tous retirés avant de calculer
 * les buffs perdus et les remplaçants.
 */
export function findVacancies({
  holders,
  statusesByCharacterId,
  candidates,
  activeBuffs,
}: FindVacanciesInput): Vacancy[] {
  const withdrawn = (h: Holder) => isWithdrawn(statusesByCharacterId.get(h.characterId) ?? []);
  const vacancies: Vacancy[] = [];

  for (const holder of holders.filter(withdrawn)) {
    const remaining = holders.filter((h) => h.bossId === holder.bossId && !withdrawn(h));
    vacancies.push({
      bossId: holder.bossId,
      characterId: holder.characterId,
      characterName: holder.name,
      class: holder.class,
      spec: holder.spec,
      role: holder.role,
      lostBuffs: lostBuffsOf(
        holder.class,
        remaining.map((h) => h.class),
        activeBuffs,
      ),
      replacements: rankReplacements({ vacancy: holder, remaining, candidates, activeBuffs }),
    });
  }
  return vacancies;
}

interface UpgradeEntry {
  boss: { id: number };
  stats?: { bestGain?: number | null; metric?: string | null } | null;
  items?: { isBiS?: boolean; isUpgrade?: boolean }[] | null;
}

/**
 * Besoin par boss d'un personnage, d'après la réponse de
 * item_upgrade.service.getCharacterBossUpgrades (même lecture que
 * buildUpgradeIndex dans la composition).
 */
export function needByBossOf(entries: UpgradeEntry[]): Map<number, BossNeed> {
  const out = new Map<number, BossNeed>();
  for (const entry of entries) {
    const items = entry.items ?? [];
    out.set(entry.boss.id, {
      bisCount: items.filter((i) => i.isBiS && i.isUpgrade).length,
      bestGain: entry.stats?.bestGain ?? 0,
      ...(entry.stats?.metric ? { metric: entry.stats.metric } : {}),
    });
  }
  return out;
}
