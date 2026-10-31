import { ForbiddenError } from '../../shared/errors/AppError';

/**
 * Rattache le royaume :realmId de l'URL à celui dont checkPermission a vérifié
 * l'accès. checkPermission refuse déjà des sources de royaume discordantes
 * (SIMS-173) ; ce contrôle garde le usecase sûr s'il est appelé autrement,
 * sinon un gestionnaire du royaume A lirait ou modifierait les réglages du
 * royaume B (SIMS-137).
 *
 * @throws {ForbiddenError} si les deux royaumes diffèrent
 */
export function assertCheckedRealm(realmId: number, checkedRealmId: number | undefined): void {
  if (!Number.isInteger(realmId) || realmId !== checkedRealmId) {
    throw new ForbiddenError();
  }
}
