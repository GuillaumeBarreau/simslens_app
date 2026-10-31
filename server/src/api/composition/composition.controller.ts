import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import { normalizeCompositionOptions, normalizeHistoryWeeks } from './composition.options';
import compositionService from './composition.service';

/**
 * Le module suit encore le pattern historique : le controller délègue à
 * composition.service (docs/api/architecture.md). L'événement :eventId est
 * rattaché au royaume par checkPermission, et le service ne le lit qu'avec ce
 * royaume (composition.repository.getEventContext).
 */

type EventParams = { eventId: number };
type RealmScopeQuery = { realmId: number; historyWeeks?: unknown };

/**
 * POST /events/:eventId/generate-composition
 *
 * Body:
 *   weights?: { buffs, upgrades, history }  // each in [0,1]
 *   sizeOverride?: number                    // ignored for Mythic, capped 1..30
 *   healerRatio?: number                     // 0..0.5
 *   historyWeeks?: number                    // 1..6
 *   selectedBossIds?: number[]               // default: all bosses of the raid
 *   minBossesPerPlayer?: number              // soft floor — fairness boost in score
 *
 * Les bornes sont appliquées par composition.options : une valeur hors
 * intervalle est ramenée dans les bornes, pas rejetée.
 *
 * Returns: a *proposal* (no DB writes). Frontend confirms and applies via
 * the existing roster-assignments endpoints.
 */
export async function generate(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmScopeQuery>(req, 'query');
  const body = validated<Record<string, unknown>>(req, 'body');

  const result = await compositionService.generateComposition({
    eventId,
    realmId,
    ...normalizeCompositionOptions(body),
  });

  res.json(result);
}

/**
 * GET /events/:eventId/composition-context?historyWeeks=6
 *
 * Returns the complete data snapshot used to drive composition: event,
 * constraints, bosses (with historical role targets), pool of PRESENT
 * signups (with per-boss upgrade stats and past-assignment counts), and
 * past raids' compositions.
 *
 * Self-contained: an LLM can build a composition from this JSON alone.
 */
export async function getContext(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId, historyWeeks } = validated<RealmScopeQuery>(req, 'query');

  const context = await compositionService.buildCompositionContext({
    eventId,
    realmId,
    historyWeeks: normalizeHistoryWeeks(historyWeeks),
  });

  res.json(context);
}
