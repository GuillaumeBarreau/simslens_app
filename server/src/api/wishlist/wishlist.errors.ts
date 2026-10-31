import { ValidationError } from '../../shared/errors/AppError';

/** Emplacement inconnu (hors `VALID_SLOTS`). */
export class InvalidWishlistSlotError extends ValidationError {
  constructor(slot: string) {
    super(`Invalid slot: ${slot}`, [], { code: 'invalid_slot' });
    this.name = 'InvalidWishlistSlotError';
  }
}

/** Spécialisation qui n'appartient pas à la classe du personnage. */
export class WishlistSpecializationMismatchError extends ValidationError {
  constructor(specializationId: number) {
    super(`Specialization ${specializationId} does not match character class`, [], {
      code: 'invalid_specialization',
    });
    this.name = 'WishlistSpecializationMismatchError';
  }
}
