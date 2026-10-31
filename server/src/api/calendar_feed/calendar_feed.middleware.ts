import type { NextFunction, Request, Response } from 'express';

/** Remplace le jeton dans les URL journalisées. */
export const MASKED_TOKEN = '[jeton-masqué]';

/** Dernier segment après `/calendar-feed/`, jusqu'à `?` ou `#`. */
const FEED_TOKEN_SEGMENT = /(\/calendar-feed\/)[^/?#]+/;

/** URL sans le jeton du flux iCal ; les autres URL sont rendues telles quelles. */
export function maskCalendarFeedToken(url: string): string {
  return url.replace(FEED_TOKEN_SEGMENT, `$1${MASKED_TOKEN}`);
}

/**
 * Le jeton de l'URL est le seul secret du flux (SIMS-204). Le journal HTTP
 * (`morgan`, qui lit `req.originalUrl` à la fin de la réponse) et
 * `errorHandler` (`path: req.originalUrl`) l'écriraient en clair : on masque
 * `req.originalUrl` dès l'entrée dans la route, avant toute validation.
 *
 * Express ne route plus sur `originalUrl` à ce stade (il utilise `req.url`),
 * et le jeton reste lisible dans `req.params.file`.
 */
export function maskFeedTokenInUrl(req: Request, _res: Response, next: NextFunction) {
  req.originalUrl = maskCalendarFeedToken(req.originalUrl);
  next();
}
