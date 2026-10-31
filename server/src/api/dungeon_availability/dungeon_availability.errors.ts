import { AppError } from '../../shared/errors/AppError';

/**
 * Créneau introuvable, ou hors de la portée de l'appelant.
 *
 * Les deux cas partagent la même réponse : révéler qu'un créneau existe sur
 * un autre royaume serait une fuite d'information.
 */
export class AvailabilityNotFoundError extends AppError {
  constructor() {
    super('Availability not found', 404, { code: 'not_found' });
  }
}
