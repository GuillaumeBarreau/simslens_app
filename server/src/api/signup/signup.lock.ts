/**
 * Verrou d'inscription.
 *
 * Passé un certain délai avant le début du raid, les inscriptions se figent
 * pour que le roster arrêté ne bouge plus. Trois échappatoires : les
 * responsables du royaume, un délai nul, ou un verrou désactivé sur
 * l'événement.
 */

import { prisma } from '../../data';
import { ADMIN_ROLES, DEFAULT_SIGNUP_LOCK_HOURS } from './signup.constants';
import { SignupLockedError } from './signup.errors';

const MS_PER_HOUR = 3600 * 1000;

/**
 * @throws {SignupLockedError} si la fenêtre de verrouillage est ouverte
 */
export async function assertSignupNotLocked(eventId: number, actingRole?: string): Promise<void> {
  if (actingRole && ADMIN_ROLES.has(actingRole)) return;

  const event = await prisma.raid_events.findUnique({
    where: { id: eventId },
    select: {
      startTime: true,
      signupLockDisabled: true,
      realm: { select: { signupLockHours: true } },
    },
  });

  // Un événement introuvable est laissé aux contrôles d'accès en amont.
  if (!event) return;

  if (event.signupLockDisabled) return;

  const lockHours = event.realm?.signupLockHours ?? DEFAULT_SIGNUP_LOCK_HOURS;
  if (lockHours <= 0) return;

  const lockAt = new Date(event.startTime.getTime() - lockHours * MS_PER_HOUR);
  if (Date.now() >= lockAt.getTime()) {
    throw new SignupLockedError();
  }
}
