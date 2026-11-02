import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { useTranslation } from 'react-i18next';
import type { BisSlot } from 'services/bis.service';

import { type BisOrigin, getBisOrigins } from '../bisList';

const ORIGIN_COLORS: Record<BisOrigin, string> = {
  guild: 'teal',
  curated: 'blue',
  previousTier: 'orange',
};

interface BisSlotCardProps {
  slot: BisSlot;
  /** Palier affiché, pour signaler une liste héritée d'un palier antérieur. */
  season: string;
  /** Bouton « Modifier » : seulement pour les responsables du raid. */
  onEdit?: (slot: string) => void;
}

/** Un emplacement de la liste BiS : objets dans l'ordre, le premier mis en avant. */
export function BisSlotCard({ slot, season, onEdit }: BisSlotCardProps) {
  const { t } = useTranslation('bis');
  const label = t(`slots.${slot.slot}`, { defaultValue: slot.slot });
  const origins = getBisOrigins(slot, season);

  return (
    <Card withBorder radius="md" padding="sm" data-testid={`bis-slot-${slot.slot}`}>
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Text fw={700} size="sm">
          {label}
        </Text>
        <Group gap={4} wrap="nowrap">
          {origins.map((origin) => (
            <Badge key={origin} size="xs" variant="light" color={ORIGIN_COLORS[origin]}>
              {t(`origin.${origin}`, { season: slot.season })}
            </Badge>
          ))}
        </Group>
      </Group>

      {slot.items.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t('slot_empty')}
        </Text>
      ) : (
        <Stack gap={4} component="ol" m={0} p={0} style={{ listStyle: 'none' }}>
          {slot.items.map((item, index) => (
            <Stack key={item.itemId} gap={0} component="li">
              <Group gap="xs" wrap="nowrap">
                <Badge
                  size="sm"
                  circle
                  variant={index === 0 ? 'filled' : 'default'}
                  color={index === 0 ? 'yellow' : undefined}
                  aria-label={t('rank', { rank: index + 1 })}
                >
                  {index + 1}
                </Badge>
                <Text size="sm" fw={index === 0 ? 700 : 400} truncate>
                  <WowheadLink itemId={item.itemId} game="forever" renameLink enableLink>
                    {t('item_fallback', { id: item.itemId })}
                  </WowheadLink>
                </Text>
              </Group>
              {item.note && (
                <Text size="xs" c="dimmed" pl={28}>
                  {item.note}
                </Text>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {onEdit && (
        <Button
          mt="sm"
          size="xs"
          variant="subtle"
          leftSection={<IconPencil size={14} />}
          onClick={() => onEdit(slot.slot)}
          aria-label={t('edit_slot', { slot: label })}
        >
          {t('edit')}
        </Button>
      )}
    </Card>
  );
}
