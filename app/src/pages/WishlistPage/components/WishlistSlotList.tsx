import { Box, Button, Group, Image, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core';
import { IconListDetails } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import type { Difficulty } from 'contexts/DifficultyContext';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { WishlistRecord, WishSlotStatus } from 'types/character.types';
import { getQualityColor } from 'utils/qualityColors';
import { resolveBlizzardIcon, resolveFallbackIcon } from 'utils/resolveIconPath';

import { SLOT_DETAILS } from '../constants';
import classes from '../WishlistPage.module.css';
import {
  formatDpsGain,
  getSlotLabelKey,
  type ItemSource,
  type SlotGroup,
  type SlotSuggestion,
} from '../wishlistPlan';
import { WishStatusBadge } from './WishlistInsights';

interface WishlistSlotListProps {
  characterClass?: string;
  groups: Array<{ group: SlotGroup; slots: string[] }>;
  wishlist: WishlistRecord;
  selectedSlot: string | null;
  readOnly: boolean;
  onSelectSlot: (slot: string) => void;
  /** Boss et gain de chaque objet de raid, pour la spé affichée. */
  sourceIndex: Map<number, ItemSource>;
  /** Wishlist enrichie (SIMS-205) : état, gain, suggestions. */
  showInsights: boolean;
  statusBySlot?: Record<string, WishSlotStatus>;
  snapshotOtherSpec?: boolean;
  suggestions?: Record<string, SlotSuggestion>;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  itemLevel?: number;
}

/** Gain simulé coloré : vert s'il est positif, gris sinon. */
export function GainText({ gain, size = 'sm' }: { gain: number | null; size?: string }) {
  const { t } = useTranslation('wishlist');
  if (gain == null) {
    return (
      <Text size="xs" c="dimmed" className={classes.gain}>
        {t('list.no_sim')}
      </Text>
    );
  }
  return (
    <Text size={size} c={gain > 0 ? 'teal.4' : 'dimmed'} className={classes.gain}>
      {formatDpsGain(gain)}
    </Text>
  );
}

/** Icône d'objet (ou d'emplacement vide) avec infobulle Wowhead. */
export function SlotIcon({
  icon,
  quality,
  itemId,
  itemLevel,
  size = 40,
}: {
  icon?: string;
  quality?: number | string;
  itemId?: number | null;
  itemLevel?: number;
  size?: number;
}) {
  const image = (
    <Image
      src={resolveBlizzardIcon(icon)}
      fallbackSrc={resolveFallbackIcon(icon)}
      w="100%"
      h="100%"
      alt=""
    />
  );
  return (
    <Box
      className={classes.slotIcon}
      data-empty={itemId == null || undefined}
      style={{
        width: size,
        height: size,
        borderColor: itemId != null && quality != null ? getQualityColor(quality) : undefined,
      }}
    >
      {itemId != null ? (
        <WowheadLink itemId={itemId} itemLevel={itemLevel} style={{ display: 'block' }}>
          {image}
        </WowheadLink>
      ) : (
        image
      )}
    </Box>
  );
}

interface SlotRowProps {
  slot: string;
  label: string;
  wish?: WishlistRecord[string];
  source?: ItemSource;
  status?: WishSlotStatus;
  snapshotOtherSpec?: boolean;
  suggestion?: SlotSuggestion;
  showInsights: boolean;
  selected: boolean;
  readOnly: boolean;
  onSelect: (slot: string) => void;
  itemLevel?: number;
}

function SlotRow({
  slot,
  label,
  wish,
  source,
  status,
  snapshotOtherSpec,
  suggestion,
  showInsights,
  selected,
  readOnly,
  onSelect,
  itemLevel,
}: SlotRowProps) {
  const { t } = useTranslation('wishlist');
  const filled = wish?.itemId != null;
  const clickable = !readOnly;
  // L'état du vœu (SIMS-205) fait foi quand il existe : pas de gain d'une autre
  // source à côté d'un « Pas de sim ».
  const gain = status ? status.dpsGain : (source?.dpsGain ?? null);

  // Le clic sur la ligne ouvre le tiroir ; il annule aussi l'ouverture de Wowhead
  // quand il part de l'icône (lien d'infobulle).
  const open = (event: MouseEvent) => {
    if (!clickable) return;
    event.preventDefault();
    onSelect(slot);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!clickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(slot);
    }
  };

  let detail: ReactNode = null;
  if (filled) {
    detail = (
      <Text size="xs" c="dimmed" truncate>
        {source?.bossName ?? t('list.other_source')}
      </Text>
    );
  } else if (suggestion) {
    detail = (
      <Tooltip label={t('list.suggestion_hint')} withArrow multiline maw={280}>
        <span className={classes.suggestion}>
          <Image
            src={resolveBlizzardIcon(suggestion.item.icon)}
            fallbackSrc={resolveFallbackIcon(suggestion.item.icon)}
            w={16}
            h={16}
            radius={3}
            alt=""
          />
          <Text size="xs" c="dimmed" truncate>
            {t('list.suggestion', { name: suggestion.item.name })} · {suggestion.bossName}
          </Text>
          <Text size="xs" c="teal.4" className={classes.gain}>
            {formatDpsGain(suggestion.dpsGain)}
          </Text>
        </span>
      </Tooltip>
    );
  }

  return (
    <div
      className={classes.slotRow}
      data-clickable={clickable || undefined}
      data-selected={selected || undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `${label} — ${t(filled ? 'list.change' : 'list.choose')}` : undefined}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <SlotIcon
        icon={filled ? wish?.icon : SLOT_DETAILS[slot]?.icon}
        quality={wish?.quality}
        itemId={filled ? Number(wish?.itemId) : null}
        itemLevel={itemLevel}
      />

      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
        <span className={classes.slotLabel}>{label}</span>
        {filled ? (
          <Text size="sm" fw={600} truncate style={{ color: getQualityColor(wish?.quality ?? 4) }}>
            {wish?.itemName ?? `#${wish?.itemId}`}
          </Text>
        ) : (
          // Avec une suggestion, la ligne « Meilleur gain » dit déjà que l'emplacement est vide.
          !suggestion && (
            <Text size="sm" c="dimmed" fs="italic">
              {t('list.empty_slot')}
            </Text>
          )
        )}
        {detail}
      </Stack>

      <Group gap={6} wrap="wrap" justify="flex-end" style={{ flexShrink: 1, minWidth: 0 }}>
        {showInsights && filled && status && (
          <Box visibleFrom="sm">
            <WishStatusBadge status={status} snapshotOtherSpec={snapshotOtherSpec} />
          </Box>
        )}
        {showInsights && filled && (gain != null || !status) && <GainText gain={gain} />}
      </Group>

      {clickable && (
        <Button
          size="xs"
          variant={filled ? 'subtle' : 'light'}
          color={filled ? 'gray' : 'brand'}
          visibleFrom="sm"
          tabIndex={-1}
          style={{ flexShrink: 0 }}
        >
          {t(filled ? 'list.change' : 'list.choose')}
        </Button>
      )}
    </div>
  );
}

/**
 * Vue par emplacement (SIMS-250) : chaque emplacement avec son BiS choisi, sa
 * provenance et, sous `wishlist-insights`, son état et son gain ; un
 * emplacement vide propose le meilleur gain simulé.
 */
export function WishlistSlotList({
  characterClass,
  groups,
  wishlist,
  selectedSlot,
  readOnly,
  onSelectSlot,
  sourceIndex,
  showInsights,
  statusBySlot,
  snapshotOtherSpec,
  suggestions,
  difficulty,
  onDifficultyChange,
  itemLevel,
}: WishlistSlotListProps) {
  const { t } = useTranslation('wishlist');
  const slotLabel = (slot: string) =>
    t(getSlotLabelKey(slot, characterClass), { defaultValue: SLOT_DETAILS[slot]?.label ?? slot });

  return (
    <Box component="section" className={classes.section} p={{ base: 'sm', sm: 'lg' }}>
      <Group justify="space-between" align="flex-start" gap="sm" mb="md">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <IconListDetails size={20} stroke={1.5} style={{ flexShrink: 0 }} />
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={700}>{t('list.title')}</Text>
            <Text size="xs" c="dimmed">
              {readOnly ? t('list.description_read_only') : t('list.description')}
            </Text>
          </Stack>
        </Group>
        {showInsights && (
          <Group gap={8} wrap="nowrap" align="center">
            <Text size="xs" c="dimmed">
              {t('list.gains_in')}
            </Text>
            <SegmentedControl
              size="xs"
              value={difficulty}
              onChange={(value) => onDifficultyChange(value as Difficulty)}
              data={(['normal', 'heroic', 'mythic'] as const).map((value) => ({
                value,
                label: t(`common:difficulties.${value}`),
              }))}
            />
          </Group>
        )}
      </Group>

      <Stack gap="md">
        {groups.map(({ group, slots }) => (
          <Stack key={group} gap={6}>
            <Group gap="xs" justify="space-between" px={4}>
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                tt="uppercase"
                style={{ letterSpacing: '0.08em' }}
              >
                {t(`list.groups.${group}`)}
              </Text>
              {group === 'weapons' && slots.length > 2 && (
                <Text size="xs" c="dimmed">
                  {t('list.weapons_hint')}
                </Text>
              )}
            </Group>
            <div className={classes.slotList}>
              {slots.map((slot) => {
                const wish = wishlist[slot];
                const itemId = wish?.itemId != null ? Number(wish.itemId) : null;
                return (
                  <SlotRow
                    key={slot}
                    slot={slot}
                    label={slotLabel(slot)}
                    wish={wish}
                    source={itemId != null ? sourceIndex.get(itemId) : undefined}
                    status={statusBySlot?.[slot]}
                    snapshotOtherSpec={snapshotOtherSpec}
                    suggestion={suggestions?.[slot]}
                    showInsights={showInsights}
                    selected={selectedSlot === slot}
                    readOnly={readOnly}
                    onSelect={onSelectSlot}
                    itemLevel={itemLevel}
                  />
                );
              })}
            </div>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
