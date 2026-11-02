import { SimpleGrid, Stack, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BisSlot } from 'services/bis.service';

import { groupBisSlots } from '../bisList';
import { BisSlotCard } from './BisSlotCard';

interface BisSlotGridProps {
  slots: readonly BisSlot[] | undefined;
  season: string;
  /** Absent en lecture seule. */
  onEditSlot?: (slot: string) => void;
}

/** Paperdoll de la liste BiS : armure, accessoires et armes, un encart par emplacement. */
export function BisSlotGrid({ slots, season, onEditSlot }: BisSlotGridProps) {
  const { t } = useTranslation('bis');

  return (
    <Stack gap="lg">
      {groupBisSlots(slots).map((group) => (
        <Stack key={group.id} gap="xs">
          <Title order={4}>{t(`groups.${group.id}`)}</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {group.slots.map((slot) => (
              <BisSlotCard key={slot.slot} slot={slot} season={season} onEdit={onEditSlot} />
            ))}
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}
