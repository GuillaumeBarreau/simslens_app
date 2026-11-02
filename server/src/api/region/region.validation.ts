import Joi from 'joi';

import { GAMES } from './region.types';

/** `?game=` absent : Retail, comme avant l'arrivée de Forever (SIMS-019). */
export const listRegionsQuery = Joi.object({
  game: Joi.string()
    .valid(...GAMES)
    .default('retail'),
});
