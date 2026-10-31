import { AppError } from '../../shared/errors/AppError';

/**
 * Le personnage n'existe pas, ou appartient déjà à un autre royaume.
 *
 * Les deux cas répondent la même chose : un responsable n'a pas à apprendre
 * l'existence d'un personnage d'une autre guilde.
 */
export class CharacterNotAttachableError extends AppError {
  constructor() {
    super('Character not found or attached to another realm', 404, { code: 'not_found' });
  }
}
