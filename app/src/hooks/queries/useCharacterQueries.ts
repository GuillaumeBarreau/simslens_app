import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameId } from 'config/games';
import { blizzardService } from 'services/blizzard.service';
import { type CharacterBossUpgrades, characterService } from 'services/character.service';
import type {
  AddOwnCharacterPayload,
  CreateCharacterPayload,
  UpdateCharacterPayload,
  UpdateCharacterSpecializationsPayload,
} from 'types/character.types';

export function useCharacters(realmId?: number) {
  return useQuery({
    queryKey: ['characters', realmId],
    queryFn: () => characterService.getAll(realmId),
  });
}

export function useCharacterWishlist(
  characterId: number | null | undefined,
  specializationId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['character', characterId, 'wishlist', specializationId],
    queryFn: async () => {
      if (!characterId || !specializationId) {
        return {};
      }
      return characterService.getWishlist(characterId, specializationId);
    },
    enabled: !!characterId && !!specializationId,
  });
}

/**
 * État des vœux d'une wishlist (SIMS-205). La clé est rangée sous celle de la
 * wishlist : modifier un vœu l'invalide aussi. `enabled` permet de ne pas
 * appeler l'API tant que la fonctionnalité est masquée.
 */
export function useWishlistStatus(
  characterId: number | null | undefined,
  specializationId: number | null | undefined,
  difficulty: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['character', characterId, 'wishlist', specializationId, 'status', difficulty],
    queryFn: () =>
      characterService.getWishlistStatus(characterId as number, {
        specializationId: specializationId as number,
        difficulty: difficulty as string,
      }),
    enabled: enabled && !!characterId && !!specializationId && !!difficulty,
    staleTime: 60_000,
  });
}

export function useWishlistSlotAlternatives(
  characterId: number | null | undefined,
  slot: string | null | undefined,
  params: {
    specializationId: number | null | undefined;
    difficulty: string | undefined;
    extension: string | undefined;
    season: string | undefined;
  },
  enabled = true,
) {
  const { specializationId, difficulty, extension, season } = params;
  return useQuery({
    queryKey: [
      'character',
      characterId,
      'wishlist',
      specializationId,
      'alternatives',
      slot,
      difficulty,
      extension,
      season,
    ],
    queryFn: () =>
      characterService.getWishlistSlotAlternatives(characterId as number, slot as string, {
        specializationId: specializationId as number,
        difficulty: difficulty as string,
        extension: extension as string,
        season: season as string,
      }),
    enabled:
      enabled &&
      !!characterId &&
      !!slot &&
      !!specializationId &&
      !!difficulty &&
      !!extension &&
      !!season,
    staleTime: 60_000,
  });
}

export function useCharacterSpecs(characterId: number | null | undefined) {
  return useQuery({
    queryKey: ['character', characterId, 'wishlist', 'specs'],
    queryFn: () => {
      if (!characterId) return Promise.resolve([]);
      return characterService.getCharacterSpecs(characterId);
    },
    enabled: !!characterId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Classes and their specializations: reference data, read once (SIMS-212).
 * With a game, only its classes and specs, with their `label` (SIMS-027).
 */
export function useClassSpecializations(game?: GameId) {
  return useQuery({
    queryKey: ['classes', 'specializations', game ?? 'all'],
    queryFn: () => characterService.getClassSpecializations(game),
    staleTime: Infinity,
  });
}

/**
 * A player adds their own WoW Forever character (SIMS-050): it joins the roster
 * and the player's linked characters.
 */
export function useAddOwnCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddOwnCharacterPayload) => characterService.addOwn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}

/** Main spec, off-specs and specs with sim data of a character (SIMS-212). */
export function useCharacterSpecializations(characterId: number | null | undefined) {
  return useQuery({
    queryKey: ['character', characterId, 'specializations'],
    queryFn: () => characterService.getSpecializations(characterId as number),
    enabled: !!characterId,
  });
}

export function useUpdateCharacterSpecializations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: number;
      payload: UpdateCharacterSpecializationsPayload;
    }) => characterService.updateSpecializations(characterId, payload),
    onSuccess: (_, variables) => {
      // Spé principale : liste des personnages, specs de la wishlist, vue roster.
      queryClient.invalidateQueries({ queryKey: ['character', variables.characterId] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}

/**
 * Wishlists of other specs than the one shown by the roster view (SIMS-212).
 * `enabled` lets the caller skip the call while the feature is hidden.
 */
export function useRosterHiddenSpecWishlists(
  region: string | undefined,
  realm: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['roster', 'wishlist-hidden-specs', region, realm],
    queryFn: () => characterService.getRosterHiddenSpecWishlists(region as string, realm as string),
    enabled: enabled && !!region && !!realm,
    staleTime: 60_000,
  });
}

export function usePendingCharacters(difficulty: string | undefined, realmId: number | undefined) {
  return useQuery({
    queryKey: ['characters', 'pending', difficulty, realmId],
    queryFn: () => characterService.getPending(difficulty, realmId),
    enabled: !!realmId,
    staleTime: 60_000,
  });
}

export function useFetchGuildRoster() {
  return useMutation({
    mutationFn: (input: { realm: string; guild: string; region: string; realmId: number }) =>
      blizzardService.getGuildRoster(input.realm, input.guild, input.region, input.realmId),
  });
}

export function useRosterWishlistCompletion(region: string | undefined, realm: string | undefined) {
  return useQuery({
    queryKey: ['roster', 'wishlist-completion', region, realm],
    queryFn: () => {
      if (!region || !realm) return Promise.resolve({});
      return characterService.getRosterWishlistCompletion(region, realm);
    },
    enabled: !!region && !!realm,
    staleTime: 60_000,
  });
}

export function useRosterWishlists(region: string, realm: string) {
  return useQuery({
    queryKey: ['roster', 'wishlists', region, realm],
    queryFn: async () => {
      return characterService.getRosterWishlists(region, realm);
    },
    enabled: !!region && !!realm,
  });
}

export function useUpdateWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      characterId,
      specializationId,
      slot,
      itemId,
      priority,
    }: {
      characterId: number;
      specializationId: number;
      slot: string;
      itemId: number | null;
      priority: number;
    }) => {
      return characterService.updateWishlistItem(
        characterId,
        specializationId,
        slot,
        itemId,
        priority,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['character', variables.characterId, 'wishlist', variables.specializationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['upgradesBatch'],
      });
      queryClient.invalidateQueries({
        queryKey: ['upgradeCounts'],
      });
      queryClient.invalidateQueries({
        queryKey: ['roster', 'wishlists'],
      });
      // Complétion et autres spés ignorent « je n'en veux pas » (SIMS-205) :
      // un changement de priorité seul les modifie aussi.
      queryClient.invalidateQueries({
        queryKey: ['roster', 'wishlist-completion'],
      });
      queryClient.invalidateQueries({
        queryKey: ['roster', 'wishlist-hidden-specs'],
      });
    },
  });
}

export function useCopyWishlistFromMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      characterId,
      targetSpecializationId,
      sourceId,
      sourceSpecializationId,
    }: {
      characterId: number;
      targetSpecializationId: number;
      sourceId: number;
      sourceSpecializationId: number;
    }) => {
      return characterService.copyWishlistFrom(
        characterId,
        targetSpecializationId,
        sourceId,
        sourceSpecializationId,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'character',
          variables.characterId,
          'wishlist',
          variables.targetSpecializationId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['roster', 'wishlists'],
      });
      queryClient.invalidateQueries({
        queryKey: ['upgradesBatch'],
      });
      queryClient.invalidateQueries({
        queryKey: ['upgradeCounts'],
      });
    },
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCharacterPayload) => characterService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

export function useUpdateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCharacterPayload }) =>
      characterService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

/**
 * Dernier relevé d'équipement (paperdoll de « Mon activité »). Même clé que la
 * fiche d'équipement du suivi : le cache est partagé.
 */
export function useCharacterLatestGear(characterId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['character', characterId, 'gear'],
    queryFn: () => characterService.getLatestGear(characterId as number),
    enabled: enabled && !!characterId,
    staleTime: 60_000,
  });
}

/** Vérification des enchantements et gemmes portés (SIMS-239 : pastilles, bandeau). */
export function useCharacterEnchantVerify(characterId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['character', characterId, 'enchantments', 'verify'],
    queryFn: () => characterService.verifyEnchantments(characterId as number),
    enabled: enabled && !!characterId,
    staleTime: 60_000,
  });
}

/**
 * Upgrades par boss d'un personnage pour une spé (SIMS-211). Sans
 * `specializationId`, le serveur retient la spé principale ; la spé fait partie
 * de la clé de cache, chaque spé a donc ses données.
 */
export function useCharacterBossUpgrades(
  characterId: number | null | undefined,
  params: {
    difficulty: string;
    extension: string;
    season: string;
    specializationId?: number | null;
  },
) {
  return useQuery({
    queryKey: [
      'character',
      characterId,
      'boss-upgrades',
      params.difficulty,
      params.extension,
      params.season,
      params.specializationId ?? null,
    ],
    queryFn: (): Promise<CharacterBossUpgrades> => {
      if (!characterId) {
        return Promise.resolve({
          specializationId: null,
          specialization: null,
          specializations: [],
          bosses: [],
        });
      }
      return characterService.getBossUpgrades(characterId, params);
    },
    enabled: !!characterId && !!params.difficulty && !!params.extension && !!params.season,
    staleTime: 60_000,
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, realmId }: { id: number; realmId?: number }) =>
      characterService.delete(id, realmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}
