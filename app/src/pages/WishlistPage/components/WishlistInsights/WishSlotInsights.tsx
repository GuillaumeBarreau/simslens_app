import { Divider, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { WishSlotStatus } from 'types/character.types';

import { SlotAlternatives } from './SlotAlternatives';
import { WishStatusBadge } from './WishStatusBadge';

interface WishSlotInsightsProps {
  characterId: number;
  slot: string;
  specializationId: number;
  difficulty: string;
  extension: string;
  season: string;
  itemLevel?: number;
  /** L'emplacement a un BiS choisi : sans objet, seules les alternatives sont proposées. */
  hasWish: boolean;
  status?: WishSlotStatus;
  snapshotOtherSpec?: boolean;
  /**
   * Liste des alternatives de raid sous l'état du vœu. Le tiroir de SIMS-250
   * l'intègre à sa liste de candidats (gain, boss) et la désactive ici.
   */
  withAlternatives?: boolean;
}

/**
 * Bloc « wishlist enrichie » du tiroir d'un emplacement (SIMS-205) : état du
 * BiS choisi (porté, battu, gain…) et alternatives de raid.
 */
export function WishSlotInsights({
  characterId,
  slot,
  specializationId,
  difficulty,
  extension,
  season,
  itemLevel,
  hasWish,
  status,
  snapshotOtherSpec,
  withAlternatives = true,
}: WishSlotInsightsProps) {
  const { t } = useTranslation('wishlist');

  return (
    <Stack gap="sm">
      {hasWish && status && (
        <Group gap="xs">
          <WishStatusBadge status={status} snapshotOtherSpec={snapshotOtherSpec} />
          <Text size="xs" c="dimmed">
            {t(`common:difficulties.${difficulty.toLowerCase()}`, difficulty)}
          </Text>
        </Group>
      )}
      {withAlternatives && (
        <>
          <SlotAlternatives
            characterId={characterId}
            slot={slot}
            specializationId={specializationId}
            difficulty={difficulty}
            extension={extension}
            season={season}
            itemLevel={itemLevel}
          />
          <Divider />
        </>
      )}
    </Stack>
  );
}
