import { Badge, Center, Group, Image, Loader, Stack, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { useWishlistSlotAlternatives } from 'hooks/queries';
import { useTranslation } from 'react-i18next';
import type { WishlistSlotAlternative } from 'types/character.types';
import { getQualityColor } from 'utils/qualityColors';
import { resolveBlizzardIcon, resolveFallbackIcon } from 'utils/resolveIconPath';

import { formatGain } from './insights';

/** Gain d'une alternative : vert si positif, orange sinon, gris sans sim. */
function AlternativeGain({ alternative }: { alternative: WishlistSlotAlternative }) {
  const { t } = useTranslation('wishlist');
  if (!alternative.hasSimData || alternative.dpsGain == null) {
    return (
      <Text size="xs" c="dimmed">
        {t('insights.alternatives_no_sim')}
      </Text>
    );
  }
  const { gain, percent } = formatGain(alternative.dpsGain, alternative.gainPercent);
  const positive = alternative.dpsGain > 0;
  return (
    <Text size="xs" fw={600} c={positive ? 'teal' : 'orange'}>
      {positive ? t('insights.gain', { gain, percent }) : t('insights.loss', { gain })}
    </Text>
  );
}

interface SlotAlternativesListProps {
  alternatives: WishlistSlotAlternative[];
  itemLevel?: number;
}

export function SlotAlternativesList({ alternatives, itemLevel }: SlotAlternativesListProps) {
  const { t } = useTranslation('wishlist');

  if (alternatives.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('insights.alternatives_empty')}
      </Text>
    );
  }

  return (
    <Stack gap={6}>
      {alternatives.map((alternative) => (
        <Group key={alternative.itemId} gap="xs" wrap="nowrap" align="center">
          <Image
            src={resolveBlizzardIcon(alternative.icon ?? undefined)}
            fallbackSrc={resolveFallbackIcon(alternative.icon ?? undefined)}
            w={24}
            h={24}
            radius="xs"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <WowheadLink itemId={alternative.itemId} itemLevel={itemLevel} region="eu">
                <Text
                  size="sm"
                  fw={500}
                  truncate
                  style={{ color: getQualityColor(alternative.quality ?? 4) }}
                >
                  {alternative.name}
                </Text>
              </WowheadLink>
              {alternative.isWish && (
                <Badge size="xs" variant="light" color="blue">
                  {t('insights.alternatives_current')}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" truncate>
              {alternative.boss?.name}
            </Text>
          </div>
          <AlternativeGain alternative={alternative} />
        </Group>
      ))}
    </Stack>
  );
}

interface SlotAlternativesProps {
  characterId: number;
  slot: string;
  specializationId: number;
  difficulty: string;
  extension: string;
  season: string;
  itemLevel?: number;
}

/** Alternatives de raid d'un emplacement, chargées pour la spé et la difficulté (SIMS-205). */
export function SlotAlternatives({
  characterId,
  slot,
  specializationId,
  difficulty,
  extension,
  season,
  itemLevel,
}: SlotAlternativesProps) {
  const { t } = useTranslation('wishlist');
  const { data, isLoading, isError } = useWishlistSlotAlternatives(characterId, slot, {
    specializationId,
    difficulty,
    extension,
    season,
  });

  return (
    <Stack gap="xs">
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          {t('insights.alternatives_title')}
        </Text>
        <Tooltip withArrow multiline maw={280} label={t('insights.alternatives_hint')}>
          <IconInfoCircle size={14} style={{ cursor: 'help' }} />
        </Tooltip>
      </Group>
      {isLoading ? (
        <Center py="sm">
          <Loader size="sm" />
        </Center>
      ) : isError ? (
        <Text size="sm" c="red">
          {t('insights.alternatives_error')}
        </Text>
      ) : (
        <SlotAlternativesList alternatives={data?.alternatives ?? []} itemLevel={itemLevel} />
      )}
    </Stack>
  );
}
