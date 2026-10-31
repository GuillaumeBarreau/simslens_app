import type { Request } from 'express';

import { AppError } from '../errors/AppError';
import { VALIDATED_PARTS } from './validate';

export type RequestPart = 'body' | 'query' | 'params';

type MarkedRequest = Request & { [VALIDATED_PARTS]?: Set<RequestPart> };

/**
 * Lit une partie de la requête déjà contrôlée par `validateBody`,
 * `validateQuery` ou `validateParams`, typée sans cast dans le controller.
 *
 * Joi a déjà converti les types (`"5"` → `5`) et appliqué les valeurs par
 * défaut : le controller n'a ni `parseInt` ni `as unknown as` à écrire.
 *
 * Lève une erreur 500 si aucun schéma n'a contrôlé cette partie : une route
 * qui oublie son middleware de validation échoue visiblement au lieu de
 * transmettre au usecase une entrée brute.
 *
 * @example
 *   router.get('/:characterId', validateParams(characterIdParam), controller.get);
 *
 *   export async function get(req: Request, res: Response) {
 *     const { characterId } = validated<{ characterId: number }>(req, 'params');
 *     res.json(await getCharacter(characterId));
 *   }
 */
export function validated<T>(req: Request, part: RequestPart): T {
  if (!(req as MarkedRequest)[VALIDATED_PARTS]?.has(part)) {
    throw new AppError(`req.${part} read through validated() without a validation schema`, 500, {
      code: 'unvalidated_request',
      meta: { part },
    });
  }
  return req[part] as T;
}
