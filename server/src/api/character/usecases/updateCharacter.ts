import { ForbiddenError } from '../../../shared/errors/AppError';
import { normalizeClass } from '../../../utils/normalizeClass';
import { findCharacterInRealm } from '../character.access';
import {
  CharacterAlreadyExistsError,
  CharacterNotFoundError,
  CharacterValidationError,
  InvalidSpecializationError,
} from '../character.errors';
import characterRepository from '../character.repository';
import type { UpdateCharacterInput } from '../character.types';
import {
  findSpecializationInClass,
  requireSpecializationInClass,
  resolveCharacterClass,
} from '../resolveSpecialization';

/** Champs qu'un joueur ne modifie pas sur son propre personnage (SIMS-196). */
const OFFICER_ONLY_FIELDS = ['status'] as const;

/**
 * Identité Battle.net du personnage : en self-edit, la changer reviendrait à
 * s'approprier un autre personnage sans preuve, en gardant son statut.
 */
const IDENTITY_FIELDS = ['name', 'realm', 'region', 'class'] as const;

type IdentityField = (typeof IDENTITY_FIELDS)[number];

/**
 * Le tiroir du roster renvoie tout le formulaire : une valeur identique à la base
 * (casse comprise) n'est pas un changement, ni une région vide en base que le
 * formulaire remplit par défaut.
 */
function isIdentityChange(field: IdentityField, requested: string, current: string | null) {
  if (!current) return false;
  if (field === 'class') return normalizeClass(requested) !== normalizeClass(current);
  return requested.trim().toLowerCase() !== current.trim().toLowerCase();
}

interface ExistingClassAndSpec {
  class: string;
  spec: string | null;
  specialization?: { name: string } | null;
}

/**
 * Champs `class`, `spec` et `specializationId` à écrire (SIMS-213) : la classe
 * est normalisée, la spé et son identifiant sont toujours écrits ensemble.
 *
 * Si la classe change sans spé dans la requête, la spé actuelle est cherchée par
 * nom dans la nouvelle classe (Protection guerrier → Protection paladin) ;
 * absente, la requête est refusée plutôt que de garder la spé d'une autre classe.
 */
async function resolveClassAndSpecUpdate(
  existing: ExistingClassAndSpec,
  input: UpdateCharacterInput,
): Promise<Record<string, unknown>> {
  const specRequest = input.specializationId ?? input.spec ?? undefined;
  if (input.class === undefined && specRequest === undefined) return {};

  const characterClass = await resolveCharacterClass(input.class ?? existing.class);
  const fields: Record<string, unknown> = {};
  if (input.class !== undefined) fields.class = characterClass.name;

  if (specRequest !== undefined) {
    const spec = requireSpecializationInClass(characterClass, specRequest);
    return { ...fields, spec: spec.name, specializationId: spec.id };
  }

  if (characterClass.name === normalizeClass(existing.class)) return fields;

  const currentSpec = existing.specialization?.name || existing.spec;
  if (!currentSpec) return { ...fields, spec: null, specializationId: null };

  const spec = findSpecializationInClass(characterClass, currentSpec);
  if (!spec) {
    throw new InvalidSpecializationError(
      currentSpec,
      characterClass.name,
      `La spécialisation « ${currentSpec} » n'existe pas pour la classe ${characterClass.name} : indiquer une spécialisation de la nouvelle classe`,
    );
  }
  return { ...fields, spec: spec.name, specializationId: spec.id };
}

/**
 * @param realmId royaume vérifié par checkPermission
 * @param options.selfEdit l'appelant n'est autorisé que parce qu'il possède le
 *   personnage (allowSelfEdit), pas par son rôle : il ne peut pas, entre autres,
 *   approuver lui-même un personnage en attente.
 * @throws {ForbiddenError} sur un champ réservé aux officiers en self-edit,
 *   dont un changement de nom, royaume, région ou classe
 * @throws {CharacterNotFoundError} si le personnage n'est pas dans ce royaume
 * @throws {UnknownCharacterClassError} classe inconnue après normalisation
 * @throws {InvalidSpecializationError} spé hors de la classe, y compris après
 *   un changement de classe sans nouvelle spé
 */
export async function updateCharacter(
  characterId: number,
  realmId: number,
  input: UpdateCharacterInput,
  { selfEdit = false }: { selfEdit?: boolean } = {},
) {
  if (selfEdit) {
    const reserved = OFFICER_ONLY_FIELDS.filter((field) => input[field] !== undefined);
    if (reserved.length > 0) {
      throw new ForbiddenError(`Officer-only fields: ${reserved.join(', ')}`, {
        code: 'officer_only_field',
      });
    }
  }

  const existing = await findCharacterInRealm(characterId, realmId);

  if (selfEdit) {
    const changed = IDENTITY_FIELDS.filter((field) => {
      const requested = input[field];
      return requested !== undefined && isIdentityChange(field, requested ?? '', existing[field]);
    });
    if (changed.length > 0) {
      throw new ForbiddenError(`Officer-only fields: ${changed.join(', ')}`, {
        code: 'officer_only_field',
      });
    }
  }

  if (input.name !== undefined && input.name.length < 2) {
    throw new CharacterValidationError('Le nom doit contenir au moins 2 caractères', [
      'Le nom doit contenir au moins 2 caractères',
    ]);
  }

  if (input.realm !== undefined && input.realm.length < 2) {
    throw new CharacterValidationError('Le royaume doit contenir au moins 2 caractères', [
      'Le royaume doit contenir au moins 2 caractères',
    ]);
  }

  if (input.name || input.realm) {
    const newName = input.name || existing.name;
    const newRealm = input.realm || existing.realm;
    const conflict = await characterRepository.findCharacterIdByNameAndRealm(newName, newRealm);

    if (conflict && conflict.id !== characterId) {
      throw new CharacterAlreadyExistsError(newName, newRealm);
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (input.name !== undefined) updateFields.name = input.name;
  if (input.realm !== undefined) updateFields.realm = input.realm;
  if (input.region !== undefined) updateFields.region = input.region;
  Object.assign(updateFields, await resolveClassAndSpecUpdate(existing, input));
  if (input.discordTag !== undefined && input.discordTag !== '') {
    updateFields.discordTag = input.discordTag;
  }
  if (input.status !== undefined) updateFields.status = input.status;

  await characterRepository.updateCharacterById(characterId, updateFields);

  const updated = await characterRepository.findCharacterById(characterId);
  if (!updated) throw new CharacterNotFoundError(characterId);
  return {
    ...updated,
    message: `${updated.name} a été mis à jour`,
  };
}
