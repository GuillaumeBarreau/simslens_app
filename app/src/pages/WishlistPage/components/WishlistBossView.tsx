import { Box, Center, Group, Image, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconSwords } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CharacterBossUpgrade } from 'services/character.service';
import type { WishlistRecord, WishSlotStatus } from 'types/character.types';
import { getQualityColor } from 'utils/qualityColors';
import { resolveIconPath } from 'utils/resolveIconPath';

import { SLOT_DETAILS } from '../constants';
import classes from '../WishlistPage.module.css';
import { getSlotLabelKey, groupWishesByBoss } from '../wishlistPlan';
import { GainText, SlotIcon } from './WishlistSlotList';

interface WishlistBossViewProps {
  bosses?: CharacterBossUpgrade[];
  isLoading: boolean;
  isError: boolean;
  wishlist: WishlistRecord;
  slots: string[];
  characterClass?: string;
  showInsights: boolean;
  statusBySlot?: Record<string, WishSlotStatus>;
  extension?: string;
  season?: string;
  itemLevel?: number;
}

function BossAvatar({
  icon,
  name,
  extension,
  season,
}: {
  icon: string | null;
  name: string;
  extension?: string;
  season?: string;
}) {
  const src = icon ? resolveIconPath(icon, extension, season) : '';
  if (!src) {
    return (
      <Center
        w={40}
        h={40}
        style={{ borderRadius: 8, background: 'var(--mantine-color-dark-6)', flexShrink: 0 }}
      >
        <IconSwords size={18} />
      </Center>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      w={40}
      h={40}
      radius={8}
      fallbackSrc=""
      style={{ border: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
    />
  );
}

/**
 * Vue « par boss » (SIMS-250) : les vœux de la wishlist rangés sous le boss qui
 * les donne, dans l'ordre du raid, pour préparer la soirée.
 */
export function WishlistBossView({
  bosses,
  isLoading,
  isError,
  wishlist,
  slots,
  characterClass,
  showInsights,
  statusBySlot,
  extension,
  season,
  itemLevel,
}: WishlistBossViewProps) {
  const { t } = useTranslation('wishlist');
  const { groups, otherSlots, bossesWithoutWish } = useMemo(
    () => groupWishesByBoss(bosses, wishlist, slots),
    [bosses, wishlist, slots],
  );
  const slotLabel = (slot: string) =>
    t(getSlotLabelKey(slot, characterClass), { defaultValue: SLOT_DETAILS[slot]?.label ?? slot });

  const renderWish = (slot: string, gain: number | null) => {
    const wish = wishlist[slot];
    const itemId = wish?.itemId != null ? Number(wish.itemId) : null;
    return (
      <Group key={slot} gap="sm" wrap="nowrap">
        <SlotIcon
          icon={wish?.icon}
          quality={wish?.quality}
          itemId={itemId}
          itemLevel={itemLevel}
          size={32}
        />
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} truncate style={{ color: getQualityColor(wish?.quality ?? 4) }}>
            {wish?.itemName ?? `#${itemId}`}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {slotLabel(slot)}
          </Text>
        </Stack>
        {showInsights && (
          <Box style={{ flexShrink: 0 }}>
            <GainText gain={statusBySlot?.[slot]?.dpsGain ?? gain} size="xs" />
          </Box>
        )}
      </Group>
    );
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Stack align="center" gap="xs" py="xl" ta="center">
        <IconAlertTriangle size={26} stroke={1.5} />
        <Text size="sm" c="dimmed">
          {t('boss_view.error')}
        </Text>
      </Stack>
    );
  }

  if (groups.length === 0 && otherSlots.length === 0) {
    return (
      <Stack align="center" gap="xs" py="xl" ta="center">
        <IconSwords size={26} stroke={1.5} color="var(--mantine-color-dimmed)" />
        <Text fw={600}>{t('boss_view.empty_title')}</Text>
        <Text size="sm" c="dimmed" maw={380}>
          {t('boss_view.empty_text')}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {groups.map(({ boss, wishes }) => (
          <div key={boss.id} className={classes.bossCard}>
            <Group gap="sm" wrap="nowrap">
              <BossAvatar icon={boss.icon} name={boss.name} extension={extension} season={season} />
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={700} size="sm" truncate>
                  {boss.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('boss_view.wishes_count', { count: wishes.length })}
                </Text>
              </Stack>
            </Group>
            <Stack gap={8}>{wishes.map((w) => renderWish(w.slot, w.source.dpsGain))}</Stack>
          </div>
        ))}
        {otherSlots.length > 0 && (
          <div className={classes.bossCard}>
            <Group gap="sm" wrap="nowrap">
              <Center
                w={40}
                h={40}
                style={{ borderRadius: 8, background: 'var(--mantine-color-dark-6)' }}
              >
                <IconSwords size={18} />
              </Center>
              <Stack gap={0}>
                <Text fw={700} size="sm">
                  {t('boss_view.others_title')}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('boss_view.wishes_count', { count: otherSlots.length })}
                </Text>
              </Stack>
            </Group>
            <Stack gap={8}>{otherSlots.map((slot) => renderWish(slot, null))}</Stack>
          </div>
        )}
      </SimpleGrid>
      {bossesWithoutWish.length > 0 && (
        <Text size="xs" c="dimmed">
          {t('boss_view.without_wish', { names: bossesWithoutWish.join(', ') })}
        </Text>
      )}
    </Stack>
  );
}
