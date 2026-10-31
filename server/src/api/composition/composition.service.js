const compositionRepo = require('./composition.repository');
const upgradeService = require('../item_upgrade/item_upgrade.service');
const { AppError } = require('../../shared/errors/AppError');
const {
  BUFF_PROVIDERS,
  providesBuff,
  resolveSizeCap,
  resolveNominalSize,
  DEFAULT_WEIGHTS,
  DEFAULT_HEALER_RATIO,
  TANK_TARGET,
  MAX_HISTORY_WEEKS,
} = require('./composition.constants');
const { resolveBuffs, selectForBuffs } = require('./composition.selection');
const { normalizeWithinMetric } = require('./composition.gainScale');

/**
 * Builds a per-boss roster proposal from PRESENT signups, optimising for:
 *   1. Raid buff coverage (priority — uses validation_settings.raidBuffsConfig)
 *   2. BiS / upgrade gain on this specific boss
 *   3. Historical assignment frequency on this boss (last N weeks, same raid+difficulty)
 *
 * Per-boss role distribution is also derived from history (median of past role
 * counts) so that bosses regularly run with 3 healers / 3 tanks / etc. keep
 * that shape automatically.
 *
 * Returns a proposal — NEVER persists. The caller (frontend) confirms and
 * applies via the existing roster-assignments endpoints.
 */

const {
  RAID_ROLES: ROLE_KEYS,
  getClassRoles,
  resolveRole,
  resolveRoleWithoutSpec,
} = require('../../shared/constants/roles');

/**
 * Default per-role target distribution for a given raid size.
 *  - Tanks: fixed at 2 (unless cap < 2)
 *  - Healers: ceil(cap * healerRatio)
 *  - DPS: split ~50/50 melee/ranged from what's left
 */
function defaultRoleTargets(cap, healerRatio = DEFAULT_HEALER_RATIO) {
  const tanks = Math.min(TANK_TARGET, cap);
  const healers = Math.min(Math.max(1, Math.ceil(cap * healerRatio)), cap - tanks);
  const dps = cap - tanks - healers;
  const melee = Math.floor(dps / 2);
  const ranged = dps - melee;
  return { TANK: tanks, HEALER: healers, MELEE: melee, RANGED: ranged };
}

/**
 * Compute role targets from a list of historical samples for one boss.
 *
 * Tanks and healers reflect mechanic-specific decisions ("this boss needs
 * 3 tanks") — they are NOT scaled with raid size. We take the median of
 * each, cap them at the budget, then distribute the remaining slots to
 * DPS using the historical melee/ranged ratio. This way 3T/5H stays 3T/5H
 * regardless of how the past raids' totals compare to the current cap.
 */
function rebalanceFromSamples(samples, cap) {
  if (!samples.length || cap <= 0) return null;

  const median = (role) => {
    const values = samples.map((c) => c[role] || 0).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
  };

  let tank = median('TANK');
  let healer = median('HEALER');
  const meleeMedian = median('MELEE');
  const rangedMedian = median('RANGED');

  tank = Math.min(tank, cap);
  healer = Math.min(healer, Math.max(0, cap - tank));

  const dpsBudget = Math.max(0, cap - tank - healer);
  const dpsTotal = meleeMedian + rangedMedian;
  let melee;
  let ranged;
  if (dpsTotal === 0) {
    melee = Math.floor(dpsBudget / 2);
    ranged = dpsBudget - melee;
  } else {
    melee = Math.round((dpsBudget * meleeMedian) / dpsTotal);
    if (melee > dpsBudget) melee = dpsBudget;
    ranged = dpsBudget - melee;
  }

  return { TANK: tank, HEALER: healer, MELEE: melee, RANGED: ranged };
}

function historicalRoleTargetsByBoss(pastEvents, cap) {
  const result = new Map();
  if (cap <= 0 || !pastEvents.length) return result;

  const byBoss = new Map();
  for (const evt of pastEvents) {
    const perBossThisEvent = new Map();
    for (const a of evt.event_roster_assignments) {
      if (a.bossId == null) continue;
      let counts = perBossThisEvent.get(a.bossId);
      if (!counts) {
        counts = { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 };
        perBossThisEvent.set(a.bossId, counts);
      }
      if (counts[a.role] !== undefined) counts[a.role] += 1;
    }
    for (const [bossId, counts] of perBossThisEvent) {
      let arr = byBoss.get(bossId);
      if (!arr) {
        arr = [];
        byBoss.set(bossId, arr);
      }
      arr.push(counts);
    }
  }

  for (const [bossId, samples] of byBoss) {
    const target = rebalanceFromSamples(samples, cap);
    if (target) result.set(bossId, target);
  }
  return result;
}

/**
 * Derive `{ byChar: Map<charId, Map<bossId, count>>, totalEvents }` from the
 * context-shaped `history.events` array. Used inside `generateFromContext` so
 * the algorithm always trusts the events array (the user-filtered source of
 * truth) rather than precomputed aggregates that may be stale after a
 * client-side filter.
 */
function buildHistoryStateFromEvents(historyEvents) {
  const byChar = new Map();
  const events = Array.isArray(historyEvents) ? historyEvents : [];
  for (const evt of events) {
    for (const [bossIdStr, entry] of Object.entries(evt.perBoss || {})) {
      const bossId = parseInt(bossIdStr, 10);
      const members = entry.members || [];
      for (const member of members) {
        let m = byChar.get(member.characterId);
        if (!m) {
          m = new Map();
          byChar.set(member.characterId, m);
        }
        m.set(bossId, (m.get(bossId) || 0) + 1);
      }
    }
  }
  return { byChar, totalEvents: events.length };
}

/**
 * Per-boss role-target medians derived from context.history.events
 * (the user-filtered events). Same scaling as `historicalRoleTargetsByBoss`.
 */
function historicalRoleTargetsFromContextEvents(historyEvents, cap) {
  const result = new Map();
  if (cap <= 0 || !historyEvents?.length) return result;

  const byBoss = new Map();
  for (const evt of historyEvents) {
    for (const [bossIdStr, counts] of Object.entries(evt.perBoss || {})) {
      const bossId = parseInt(bossIdStr, 10);
      if (!byBoss.has(bossId)) byBoss.set(bossId, []);
      byBoss.get(bossId).push({
        TANK: counts.TANK || 0,
        HEALER: counts.HEALER || 0,
        MELEE: counts.MELEE || 0,
        RANGED: counts.RANGED || 0,
      });
    }
  }

  for (const [bossId, samples] of byBoss) {
    const target = rebalanceFromSamples(samples, cap);
    if (target) result.set(bossId, target);
  }
  return result;
}

/**
 * Build a `Map<characterId, Set<role>>` of roles each character has actually
 * played in past raids. Used to *prove* off-spec capability beyond what the
 * class table allows in theory.
 */
function buildHistoricalRolesByChar(pastEvents) {
  const out = new Map();
  for (const evt of pastEvents) {
    for (const a of evt.event_roster_assignments || []) {
      if (!a.role) continue;
      let s = out.get(a.characterId);
      if (!s) {
        s = new Set();
        out.set(a.characterId, s);
      }
      s.add(a.role);
    }
  }
  return out;
}

/** Raison pour laquelle un inscrit présent n'entre pas dans la composition. */
const UNPLACED_MISSING_SPECIALIZATION = 'missing_specialization';

/**
 * Group pool members by their granular role (TANK/HEALER/MELEE/RANGED) and
 * compute their `playableRoles` set: primary role + class capabilities + any
 * role they've already played in past raids.
 *
 * A character without specialization (SIMS-209) takes the role declared at
 * signup (`resolveRoleWithoutSpec`) and is flagged `missingSpecialization`.
 * Without any usable role, it goes to `unplaced` instead of being dropped
 * silently.
 *
 * @returns {{ candidates: object[], unplaced: object[] }}
 */
function buildCandidates(pool, historicalRolesByChar = new Map()) {
  const candidates = [];
  const unplaced = [];
  for (const signup of pool) {
    const character = signup.character;
    const missingSpecialization = !character.specialization;
    const specName = character.specialization?.name || null;
    const granularRole = missingSpecialization
      ? resolveRoleWithoutSpec(signup.role, character.class)
      : resolveRole(character.class, specName, character.specialization?.role || null);
    if (!granularRole) {
      unplaced.push({
        characterId: character.id,
        userId: character.userId || null,
        name: character.name,
        class: character.class,
        reason: UNPLACED_MISSING_SPECIALIZATION,
      });
      continue;
    }
    const playable = new Set([granularRole]);
    for (const r of getClassRoles(character.class)) playable.add(r);
    const histRoles = historicalRolesByChar.get(character.id);
    if (histRoles) for (const r of histRoles) playable.add(r);
    candidates.push({
      characterId: character.id,
      userId: character.userId || null,
      name: character.name,
      class: character.class,
      specName,
      role: granularRole,
      playableRoles: playable,
      missingSpecialization,
    });
  }
  return { candidates, unplaced };
}

/**
 * Avertissements des inscrits sans spécialisation (SIMS-209) : placés avec
 * leur rôle d'inscription (`missing_specialization`), ou non placés faute de
 * rôle exploitable (`unplaced`).
 */
function missingSpecializationWarnings(pool, unplaced) {
  const warnings = [];
  for (const p of pool) {
    if (!p.missingSpecialization) continue;
    warnings.push({
      type: 'missing_specialization',
      characterId: p.characterId,
      characterName: p.name,
      role: p.granularRole,
    });
  }
  for (const u of unplaced) {
    warnings.push({
      type: 'unplaced',
      reason: u.reason,
      characterId: u.characterId,
      characterName: u.name,
    });
  }
  return warnings;
}

/**
 * Build a `Map<characterId, Map<bossId, count>>` from past events.
 * Count = number of past raids in which the character was assigned to that boss.
 */
function buildHistoryCounts(pastEvents) {
  const byChar = new Map();
  for (const evt of pastEvents) {
    for (const a of evt.event_roster_assignments) {
      let perBoss = byChar.get(a.characterId);
      if (!perBoss) {
        perBoss = new Map();
        byChar.set(a.characterId, perBoss);
      }
      const key = a.bossId ?? -1;
      perBoss.set(key, (perBoss.get(key) || 0) + 1);
    }
  }
  return { byChar, totalEvents: pastEvents.length };
}

/**
 * Per-character per-boss upgrade stats.
 * Returns `Map<characterId, Map<bossId, { expectedGain, bestGain, isBiSCount }>>`.
 */
async function buildUpgradeIndex(candidates, { difficulty, extension, season }) {
  const index = new Map();
  if (!difficulty || !extension || !season) return index;

  const results = await Promise.all(
    candidates.map(async (c) => {
      try {
        const data = await upgradeService.getCharacterBossUpgrades({
          characterId: c.characterId,
          difficulty,
          extension,
          season,
        });
        return { characterId: c.characterId, data };
      } catch (err) {
        console.warn(
          `[Composition] upgrades fetch failed for char ${c.characterId}:`,
          err?.message,
        );
        return { characterId: c.characterId, data: [] };
      }
    }),
  );

  for (const { characterId, data } of results) {
    const perBoss = new Map();
    for (const entry of data) {
      const stats = entry.stats || {};
      const allItems = entry.items || [];
      const bisCount = allItems.filter((i) => i.isBiS && i.isUpgrade).length;
      const highlightedItems = allItems
        .filter((i) => i.isUpgrade || i.isBiS)
        .slice(0, 6)
        .map((i) => ({
          itemId: i.id,
          name: i.name,
          slot: i.inventoryType ?? null,
          itemLevel: i.itemLevel ?? null,
          dpsGain: i.dpsGain != null ? Number(i.dpsGain.toFixed(1)) : null,
          gainPercent: i.gainPercent != null ? Number(i.gainPercent.toFixed(2)) : null,
          isBiS: !!i.isBiS,
          isWishlist: !!i.isWishlist,
          isUpgrade: !!i.isUpgrade,
          hasSimData: !!i.hasSimData,
        }));
      perBoss.set(entry.boss.id, {
        expectedGain: stats.expectedGain || 0,
        bestGain: stats.bestGain || 0,
        metric: stats.metric ?? null,
        isBiSCount: bisCount,
        upgradesCount: stats.upgradesCount || 0,
        highlightedCount: stats.highlightedCount || 0,
        items: highlightedItems,
      });
    }
    index.set(characterId, perBoss);
  }
  return index;
}

function rawScores({ candidate, bossId, upgradeIndex, history }) {
  const upgradeStats = upgradeIndex.get(candidate.characterId)?.get(bossId);
  const upgradeRaw = upgradeStats?.bestGain || 0;
  // Grandeur du gain brut (SIMS-202) : HPS pour une sim QE Live de soigneur.
  const upgradeMetric = upgradeStats?.metric ?? null;

  const charHist = history.byChar.get(candidate.characterId);
  const historyRaw =
    history.totalEvents > 0 && charHist ? (charHist.get(bossId) || 0) / history.totalEvents : 0;

  return { upgradeRaw, upgradeMetric, historyRaw };
}

/**
 * Phase B — fill remaining slots by descending score, respecting role caps
 * and one-character-per-user.
 */
function selectForScore({
  candidatesByRole,
  selected,
  roleTargets,
  roleFilled,
  scoredByCandidateId,
  selectedUserIds,
}) {
  for (const role of ROLE_KEYS) {
    const remaining = roleTargets[role] - (roleFilled[role] || 0);
    if (remaining <= 0) continue;
    const list = (candidatesByRole[role] || [])
      .filter((c) => !selected.has(c.characterId) && (!c.userId || !selectedUserIds.has(c.userId)))
      // Primary-role candidates first; ties broken by score. Off-specs only
      // come in once primaries are exhausted.
      .sort((a, b) => {
        if (a.isPrimaryRole !== b.isPrimaryRole) return a.isPrimaryRole ? -1 : 1;
        return (
          (scoredByCandidateId.get(b.characterId) || 0) -
          (scoredByCandidateId.get(a.characterId) || 0)
        );
      })
      .slice(0, remaining);
    for (const cand of list) {
      selected.set(cand.characterId, {
        candidate: cand,
        role,
        reason: cand.isPrimaryRole ? 'score' : 'score:offspec',
      });
      roleFilled[role] = (roleFilled[role] || 0) + 1;
      if (cand.userId) selectedUserIds.add(cand.userId);
    }
  }
}

/**
 * Avertissements `role_short` d'un boss (SIMS-222) : un rôle manque dès que sa
 * cible dépasse le nombre de candidats dont c'est le rôle principal. Les
 * candidats hors spé peuvent combler le poste (`role_offspec_fill`), mais ne
 * masquent plus le manque de vrais tanks ou soigneurs.
 *
 * `available` compte les candidats du rôle principal, `offspecAvailable` ceux
 * qui ne peuvent le tenir qu'hors spé.
 */
function roleShortWarnings({ boss, baseRoleTargets, roleTargets, candidatesByRole }) {
  const warnings = [];
  for (const role of ROLE_KEYS) {
    const target = baseRoleTargets[role] || 0;
    const eligible = candidatesByRole[role] || [];
    const available = eligible.filter((c) => c.isPrimaryRole).length;
    if (target > available || target > roleTargets[role]) {
      warnings.push({
        type: 'role_short',
        role,
        bossId: boss.id,
        target,
        available,
        offspecAvailable: eligible.length - available,
      });
    }
  }
  return warnings;
}

/**
 * Build the proposal for a single boss.
 *
 * Score per candidate = w_upgrade × upgradeNorm + w_history × historyRatio
 * + fairnessBoost(deficit relative to `minBossesPerPlayer`).
 *
 * The fairness boost is large enough to dominate other components when a
 * candidate is below the per-player boss minimum, but doesn't break Phase A's
 * buff requirement (class match wins first).
 */
function buildBossAssignment({
  boss,
  candidates,
  upgradeIndex,
  history,
  weights,
  cap,
  healerRatio,
  activeBuffs,
  historicalTargets,
  perCharBossesAssigned,
  remainingBossesAfter,
  minBossesPerPlayer,
}) {
  if (cap === 0 || candidates.length === 0) {
    return { boss, assignments: [], warnings: [{ type: 'empty_pool', bossId: boss.id }] };
  }

  const candidatesByRole = { TANK: [], HEALER: [], MELEE: [], RANGED: [] };
  for (const c of candidates) {
    for (const r of ROLE_KEYS) {
      const playable = c.playableRoles?.has(r);
      if (c.role === r || playable) {
        candidatesByRole[r].push({ ...c, isPrimaryRole: c.role === r });
      }
    }
  }

  const raws = candidates.map((c) =>
    rawScores({ candidate: c, bossId: boss.id, upgradeIndex, history }),
  );
  const historyRaws = raws.map((r) => r.historyRaw);
  // Gains bruts ramenés à [0, 1] par grandeur : des HPS (QE Live) ne sont
  // jamais comparés tels quels à des DPS (SIMS-202).
  const upgradeNorm = normalizeWithinMetric(
    raws.map((r) => r.upgradeRaw),
    raws.map((r) => r.upgradeMetric),
  );

  const scoredByCandidateId = new Map();
  candidates.forEach((c, idx) => {
    let score = weights.upgrades * upgradeNorm[idx] + weights.history * historyRaws[idx];

    if (minBossesPerPlayer > 0) {
      const assigned = perCharBossesAssigned.get(c.characterId) || 0;
      const deficit = Math.max(0, minBossesPerPlayer - assigned);
      if (deficit > 0) {
        const slack = remainingBossesAfter + 1 - deficit;
        const urgency = slack <= 0 ? 100 : 10 / Math.max(1, slack);
        score += urgency * deficit;
      }
    }

    scoredByCandidateId.set(c.characterId, score);
  });

  const baseRoleTargets = historicalTargets || defaultRoleTargets(cap, healerRatio);
  const roleTargets = {};
  for (const role of ROLE_KEYS) {
    roleTargets[role] = Math.min(baseRoleTargets[role] || 0, candidatesByRole[role].length, cap);
  }
  let sumTargets = ROLE_KEYS.reduce((s, r) => s + roleTargets[r], 0);
  if (sumTargets > cap) {
    let over = sumTargets - cap;
    for (const role of ['RANGED', 'MELEE', 'HEALER']) {
      if (over <= 0) break;
      const cut = Math.min(roleTargets[role], over);
      roleTargets[role] -= cut;
      over -= cut;
    }
    sumTargets = ROLE_KEYS.reduce((s, r) => s + roleTargets[r], 0);
    console.warn(
      `[Composition] role targets exceeded cap for boss ${boss.id} (cap=${cap}); trimmed to ${sumTargets}`,
    );
  }

  const selected = new Map();
  const selectedClasses = new Set();
  const selectedUserIds = new Set();
  const roleFilled = { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 };
  const warnings = [];

  selectForBuffs({
    bossId: boss.id,
    candidatesByRole,
    selected,
    selectedClasses,
    roleTargets,
    roleFilled,
    scoredByCandidateId,
    activeBuffs,
    warnings,
  });
  for (const { candidate } of selected.values()) {
    if (candidate.userId) selectedUserIds.add(candidate.userId);
  }
  selectForScore({
    candidatesByRole,
    selected,
    roleTargets,
    roleFilled,
    scoredByCandidateId,
    selectedUserIds,
  });

  const assignments = [];
  let position = 0;
  for (const role of ROLE_KEYS) {
    const inRole = [...selected.values()]
      .filter((s) => s.role === role)
      .sort(
        (a, b) =>
          (scoredByCandidateId.get(b.candidate.characterId) || 0) -
          (scoredByCandidateId.get(a.candidate.characterId) || 0),
      );
    for (const s of inRole) {
      const offspec = s.candidate.role !== role;
      assignments.push({
        characterId: s.candidate.characterId,
        characterName: s.candidate.name,
        class: s.candidate.class,
        spec: s.candidate.specName,
        role,
        position: position++,
        score: scoredByCandidateId.get(s.candidate.characterId) || 0,
        reason: s.reason,
        offspec,
      });
      if (offspec) {
        warnings.push({
          type: 'role_offspec_fill',
          role,
          bossId: boss.id,
          characterId: s.candidate.characterId,
          characterName: s.candidate.name,
          primaryRole: s.candidate.role,
        });
      }
    }
  }

  warnings.push(...roleShortWarnings({ boss, baseRoleTargets, roleTargets, candidatesByRole }));

  const roleSource = historicalTargets ? 'history' : 'default';

  return {
    boss,
    assignments,
    warnings,
    roleTargets: baseRoleTargets,
    roleSource,
  };
}

/**
 * Build the per-character "buffs brought" list from class.
 * A character brings a buff if their class appears in BUFF_PROVIDERS[buffKey]
 * (normalized class comparison, SIMS-219).
 */
function buffsBroughtByClass(className) {
  const out = [];
  for (const [key, classes] of Object.entries(BUFF_PROVIDERS)) {
    if (providesBuff(classes, className)) out.push(key);
  }
  return out;
}

/**
 * Build the comprehensive context JSON — everything the algorithm (or an LLM)
 * needs to produce a composition.
 *
 * Shape (stable, versioned via `schemaVersion`):
 *   - event: identity + raid + difficulty
 *   - constraints: caps, default role targets, active buffs (with providers)
 *   - bosses: full list with historical role targets when available
 *   - pool: PRESENT signups, with class/spec, buffs brought, per-boss
 *     upgrade stats, and per-boss past-assignment counts
 *   - history: list of past raids (same raid+difficulty), with role counts
 *     and assigned characterIds per boss
 *
 * Heavy work: one `getCharacterBossUpgrades` call per pool character. Run in
 * parallel via Promise.all.
 */
async function buildCompositionContext({ eventId, realmId, historyWeeks = MAX_HISTORY_WEEKS }) {
  const event = await compositionRepo.getEventContext(eventId, realmId);
  if (!event) throw new AppError('Event not found or not accessible', 404);

  const raid = event.raid_difficulty?.raid;
  const difficulty = event.raid_difficulty?.difficulty;
  if (!raid || !difficulty) {
    throw new AppError('Event has no raid/difficulty configured', 400);
  }

  const weeks = Math.min(historyWeeks, MAX_HISTORY_WEEKS);

  const [allBosses, pool, pastEvents, validationSettings] = await Promise.all([
    compositionRepo.getBossesForRaid({
      extension: raid.extension,
      season: raid.season,
      raidName: raid.name,
    }),
    compositionRepo.getPresentPool(eventId),
    compositionRepo.getPastBossAssignments({
      realmId,
      raidDifficultyId: event.raidDifficultyId,
      excludeEventId: eventId,
      beforeDate: event.startTime,
      weeks,
    }),
    compositionRepo.getValidationSettings(realmId),
  ]);

  const historicalRolesByChar = buildHistoricalRolesByChar(pastEvents);
  const { candidates, unplaced } = buildCandidates(pool, historicalRolesByChar);
  const upgradeIndex = await buildUpgradeIndex(candidates, {
    difficulty,
    extension: raid.extension,
    season: raid.season,
  });

  const sizeHardCap = (difficulty || '').toLowerCase() === 'mythic' ? 20 : null;
  const flexCapMax = 30;
  const referenceCap = resolveNominalSize(difficulty);
  const defaultRoleTargets = defaultRoleTargets_(referenceCap);
  const historicalTargets = historicalRoleTargetsByBoss(pastEvents, referenceCap);

  const allBuffs = resolveBuffs(validationSettings?.raidBuffsConfig);
  const activeBuffs = allBuffs.filter((b) => b.enabled);

  const histCounts = buildHistoryCounts(pastEvents);
  const samplesPerBoss = new Map();
  for (const evt of pastEvents) {
    const seen = new Set();
    for (const a of evt.event_roster_assignments) {
      if (a.bossId != null) seen.add(a.bossId);
    }
    for (const bid of seen) samplesPerBoss.set(bid, (samplesPerBoss.get(bid) || 0) + 1);
  }

  const bosses = allBosses.map((b) => {
    const histTargets = historicalTargets.get(b.id) || null;
    return {
      id: b.id,
      name: b.name,
      order: b.order,
      icon: b.icon || null,
      raidName: b.raidName || raid.name,
      historicalRoleTargets: histTargets,
      historicalRoleSamples: samplesPerBoss.get(b.id) || 0,
      effectiveRoleTargets: histTargets || defaultRoleTargets,
      roleSource: histTargets ? 'history' : 'default',
    };
  });

  const players = candidates.map((c) => {
    const perBoss = {};
    const upgradesForChar = upgradeIndex.get(c.characterId);
    if (upgradesForChar) {
      for (const [bossId, stats] of upgradesForChar) {
        perBoss[bossId] = {
          bestGain: Number((stats.bestGain || 0).toFixed(1)),
          expectedGain: Number((stats.expectedGain || 0).toFixed(1)),
          // « hps » : bestGain / expectedGain sont des HPS (QE Live, SIMS-202).
          metric: stats.metric ?? null,
          bisCount: stats.isBiSCount || 0,
          upgradesCount: stats.upgradesCount || 0,
          highlightedCount: stats.highlightedCount || 0,
          items: stats.items || [],
        };
      }
    }
    const charHist = histCounts.byChar.get(c.characterId);
    const historyByBoss = {};
    let historyTotal = 0;
    if (charHist) {
      for (const [bossId, count] of charHist) {
        if (bossId === -1) continue;
        historyByBoss[bossId] = count;
        historyTotal += count;
      }
    }
    return {
      characterId: c.characterId,
      name: c.name,
      userId: c.userId,
      class: c.class,
      spec: c.specName,
      missingSpecialization: c.missingSpecialization,
      granularRole: c.role,
      playableRoles: [...c.playableRoles],
      buffsBrought: buffsBroughtByClass(c.class),
      perBoss,
      historyByBoss,
      historyTotal,
    };
  });

  const history = {
    weeksRequested: weeks,
    eventsFound: pastEvents.length,
    events: pastEvents.map((evt) => {
      const perBoss = {};
      for (const a of evt.event_roster_assignments) {
        if (a.bossId == null) continue;
        let entry = perBoss[a.bossId];
        if (!entry) {
          entry = {
            TANK: 0,
            HEALER: 0,
            MELEE: 0,
            RANGED: 0,
            classes: {},
            members: [],
          };
          perBoss[a.bossId] = entry;
        }
        if (entry[a.role] !== undefined) entry[a.role] += 1;
        const klass = a.character?.class || 'Unknown';
        entry.classes[klass] = (entry.classes[klass] || 0) + 1;
        entry.members.push({
          characterId: a.characterId,
          name: a.character?.name || null,
          class: klass,
          spec: a.character?.specialization?.name || null,
          role: a.role,
        });
      }
      return {
        id: evt.id,
        title: evt.title,
        startTime: evt.startTime,
        perBoss,
      };
    }),
  };

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    event: {
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      raidDifficultyId: event.raidDifficultyId,
      realmId,
      difficulty,
      raid: {
        id: raid.id,
        name: raid.name,
        extension: raid.extension,
        season: raid.season,
      },
    },
    constraints: {
      sizeHardCap,
      flexCapMax,
      referenceCap,
      defaultRoleTargets,
      activeBuffs,
      allBuffs,
    },
    bosses,
    pool: players,
    unplaced: unplaced.map((u) => ({
      characterId: u.characterId,
      name: u.name,
      class: u.class,
      reason: u.reason,
    })),
    history,
  };
}

function defaultRoleTargets_(cap, healerRatio = DEFAULT_HEALER_RATIO) {
  return defaultRoleTargets(cap, healerRatio);
}

/**
 * Run the composition algorithm against a pre-built context.
 *
 * Pure function (modulo logging) — no DB calls. All inputs come from the
 * context. Use this if you've already fetched the context separately.
 */
function generateFromContext(
  context,
  {
    weights = DEFAULT_WEIGHTS,
    sizeOverride,
    healerRatio = DEFAULT_HEALER_RATIO,
    selectedBossIds = null,
    minBossesPerPlayer = 0,
  } = {},
) {
  const { event, bosses: allBosses, pool, history, constraints } = context;
  const unplaced = Array.isArray(context.unplaced) ? context.unplaced : [];
  const specWarnings = missingSpecializationWarnings(pool, unplaced);

  if (!allBosses || allBosses.length === 0) {
    return {
      bosses: [],
      warnings: [{ type: 'no_bosses' }, ...specWarnings],
      unplaced,
      meta: { poolSize: pool.length },
    };
  }

  const bosses =
    Array.isArray(selectedBossIds) && selectedBossIds.length > 0
      ? allBosses.filter((b) => selectedBossIds.includes(b.id))
      : allBosses;

  if (bosses.length === 0) {
    return {
      bosses: [],
      warnings: [{ type: 'no_bosses_selected' }, ...specWarnings],
      unplaced,
      meta: { poolSize: pool.length },
    };
  }

  const cap = resolveSizeCap(event.difficulty, pool.length, sizeOverride);

  const candidates = pool.map((p) => ({
    characterId: p.characterId,
    userId: p.userId,
    name: p.name,
    class: p.class,
    specName: p.spec,
    role: p.granularRole,
    playableRoles: new Set(
      Array.isArray(p.playableRoles) && p.playableRoles.length > 0
        ? p.playableRoles
        : [p.granularRole, ...getClassRoles(p.class)],
    ),
  }));

  const upgradeIndex = new Map();
  for (const p of pool) {
    const perBoss = new Map();
    for (const [bossId, stats] of Object.entries(p.perBoss || {})) {
      perBoss.set(parseInt(bossId, 10), {
        bestGain: stats.bestGain,
        expectedGain: stats.expectedGain,
        metric: stats.metric ?? null,
        isBiSCount: stats.bisCount,
      });
    }
    upgradeIndex.set(p.characterId, perBoss);
  }

  const historyState = buildHistoryStateFromEvents(history.events || []);

  const activeBuffs =
    (weights.buffs ?? 0) > 0
      ? constraints.activeBuffs.map((b) => ({ key: b.key, classes: b.providers }))
      : [];

  const historicalTargetsByBoss = historicalRoleTargetsFromContextEvents(history.events || [], cap);

  const perCharBossesAssigned = new Map();
  const perBoss = [];
  for (let i = 0; i < bosses.length; i += 1) {
    const boss = bosses[i];
    const remainingBossesAfter = bosses.length - 1 - i;
    const result = buildBossAssignment({
      boss,
      candidates,
      upgradeIndex,
      history: historyState,
      weights,
      cap,
      healerRatio,
      activeBuffs,
      historicalTargets: historicalTargetsByBoss.get(boss.id) || null,
      perCharBossesAssigned,
      remainingBossesAfter,
      minBossesPerPlayer,
    });
    for (const a of result.assignments) {
      perCharBossesAssigned.set(a.characterId, (perCharBossesAssigned.get(a.characterId) || 0) + 1);
    }
    perBoss.push(result);
  }

  const warnings = [...specWarnings];
  for (const result of perBoss) warnings.push(...result.warnings);
  if (minBossesPerPlayer > 0) {
    for (const c of candidates) {
      const count = perCharBossesAssigned.get(c.characterId) || 0;
      if (count > 0 && count < minBossesPerPlayer) {
        warnings.push({
          type: 'player_below_min',
          characterId: c.characterId,
          characterName: c.name,
          assigned: count,
          target: minBossesPerPlayer,
        });
      }
    }
  }

  return {
    bosses: perBoss,
    warnings,
    unplaced,
    meta: {
      poolSize: candidates.length,
      cap,
      historyEvents: history.eventsFound,
      activeBuffs: activeBuffs.map((b) => b.key),
      difficulty: event.difficulty,
      raid: event.raid,
      bossesAnalyzed: bosses.length,
      bossesWithHistoricalRoles: historicalTargetsByBoss.size,
      minBossesPerPlayer,
    },
  };
}

/**
 * Public entry point. Builds the context (or reuses a pre-built one) and
 * runs the algorithm.
 *
 * @param {{ eventId: number, realmId: number } & Partial<import('./composition.options').CompositionOptions>} params
 */
async function generateComposition({
  eventId,
  realmId,
  weights = DEFAULT_WEIGHTS,
  sizeOverride,
  healerRatio = DEFAULT_HEALER_RATIO,
  historyWeeks = MAX_HISTORY_WEEKS,
  selectedBossIds = null,
  minBossesPerPlayer = 0,
  context = null,
}) {
  const ctx =
    context && context.schemaVersion === 1
      ? context
      : await buildCompositionContext({ eventId, realmId, historyWeeks });
  return generateFromContext(ctx, {
    weights,
    sizeOverride,
    healerRatio,
    selectedBossIds,
    minBossesPerPlayer,
  });
}

module.exports = {
  buildCompositionContext,
  generateFromContext,
  generateComposition,
};
