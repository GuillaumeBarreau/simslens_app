import { AppError } from '../../shared/errors/AppError';

/** Le personnage n'a encore aucun instantané d'équipement à vérifier. */
export class NoGearSnapshotError extends AppError {
  constructor() {
    super('No gear snapshot found for this character', 404, { code: 'not_found' });
  }
}
