import type {
  RosterByRole,
  SignupCharacter,
  SignupEntity,
  UpsertSignupInput,
} from './signup.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const signupRepository: {
  findSignupCharacter(characterId: number): Promise<SignupCharacter | null>;
  upsert(data: UpsertSignupInput): Promise<SignupEntity>;
  findByEvent(eventId: number): Promise<SignupEntity[]>;
  findByCharacter(characterId: number): Promise<SignupEntity[]>;
  getRosterGroupedByRole(eventId: number): Promise<RosterByRole>;
  remove(eventId: number, characterId: number): Promise<SignupEntity>;
  findByEventAndCharacter(eventId: number, characterId: number): Promise<SignupEntity | null>;
};

export default signupRepository;
