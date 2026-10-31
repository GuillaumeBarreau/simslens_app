import Joi from 'joi';

/**
 * Dernier segment de l'URL du flux : le jeton (base64url), suivi ou non de
 * `.ics`. Un format invalide est refusé avant toute lecture en base.
 */
export const calendarFeedFileParam = Joi.object({
  file: Joi.string()
    .pattern(/^[A-Za-z0-9_-]{32,128}(\.ics)?$/)
    .required()
    .messages({ 'string.pattern.base': 'Invalid calendar feed token' }),
});
