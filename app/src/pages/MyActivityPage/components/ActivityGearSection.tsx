import { ActionIcon, Box, Group, SegmentedControl, Skeleton, Text, Tooltip } from '@mantine/core';
import { IconHanger, IconTag, IconTagOff } from '@tabler/icons-react';
import { useCharacterLatestGear } from 'hooks/queries';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LatestGearResponse, WishlistRecord } from 'types/character.types';

import type { GearAnomaly } from '../activitySummary';
import classes from '../MyActivityPage.module.css';
import { ActivityCharacterPanel } from './ActivityCharacterPanel';
import { ActivitySection } from './ActivitySection';
import { SlotAnomalyBadge } from './SlotAnomalyBadge';

export type GearView = 'wishlist' | 'snapgear';

interface ActivityGearSectionProps {
  id?: string;
  characterId: number | null | undefined;
  characterClass?: string;
  characterImage?: string;
  wishlist: WishlistRecord | undefined;
  wishlistLoading: boolean;
  /** Anomalies d'enchantement et de gemme, par emplacement. */
  anomaliesBySlot: Record<string, GearAnomaly[]>;
  view: GearView;
  onViewChange: (view: GearView) => void;
}

type PanelItems = Record<
  string,
  { itemId?: number; name?: string; icon?: string; quality?: number; itemLevel?: number }
>;

function toPanelItems(gear: LatestGearResponse | undefined): PanelItems {
  if (!gear?.snapshot?.items) return {};
  return gear.snapshot.items.reduce<PanelItems>((acc, item) => {
    acc[item.slot] = {
      itemId: item.itemId,
      name: item.item.name,
      icon: item.item.icon,
      quality: item.item.quality,
      itemLevel: item.ilevel || item.upgradeItemLevel || item.item?.itemLevel,
    };
    return acc;
  }, {});
}

function LegendBadge({ status, label }: { status: 'alert' | 'warning'; label: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Box component="span" className={classes.slotBadge} data-status={status} pos="static">
        !
      </Box>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

/**
 * Équipement porté et wishlist sur le paperdoll (SIMS-239). En vue équipement,
 * une pastille signale les emplacements dont l'enchantement ou la gemme est à
 * corriger.
 */
export function ActivityGearSection({
  id,
  characterId,
  characterClass,
  characterImage,
  wishlist,
  wishlistLoading,
  anomaliesBySlot,
  view,
  onViewChange,
}: ActivityGearSectionProps) {
  const { t } = useTranslation('myActivity');
  const [showLabels, setShowLabels] = useState(false);

  const { data: gear, isLoading: gearLoading } = useCharacterLatestGear(
    characterId,
    view === 'snapgear',
  );
  const gearItems = useMemo(() => toPanelItems(gear), [gear]);

  const slotMarkers = useMemo(() => {
    if (view !== 'snapgear') return undefined;
    const markers: Record<string, ReactNode> = {};
    for (const [slot, anomalies] of Object.entries(anomaliesBySlot)) {
      markers[slot] = <SlotAnomalyBadge anomalies={anomalies} />;
    }
    return markers;
  }, [anomaliesBySlot, view]);

  const items = (view === 'wishlist' ? (wishlist ?? {}) : gearItems) as PanelItems;
  const loading = view === 'wishlist' ? wishlistLoading : gearLoading;
  const hasAnomalies = Object.keys(anomaliesBySlot).length > 0;

  let description = t('gear.description_wishlist');
  if (view === 'snapgear') {
    description = hasAnomalies ? t('gear.description_anomalies') : t('gear.description_gear');
  }
  const labelsTooltip = showLabels ? t('wishlist.hide_labels') : t('wishlist.show_labels');

  return (
    <ActivitySection
      id={id}
      icon={<IconHanger size={20} />}
      color="grape"
      title={t('gear.title')}
      description={description}
      actions={
        <Group gap="xs" wrap="nowrap">
          {view === 'wishlist' && (
            <Tooltip label={labelsTooltip}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setShowLabels((v) => !v)}
                aria-label={labelsTooltip}
              >
                {showLabels ? <IconTag size={16} /> : <IconTagOff size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
          <SegmentedControl
            size="sm"
            radius="md"
            color="brand.5"
            value={view}
            onChange={(v) => onViewChange(v as GearView)}
            data={[
              { label: t('tabs.snapgear'), value: 'snapgear' },
              { label: t('tabs.wishlist'), value: 'wishlist' },
            ]}
          />
        </Group>
      }
    >
      {loading ? (
        <Skeleton h={520} radius="md" />
      ) : (
        <ActivityCharacterPanel
          items={items}
          characterImage={characterImage}
          characterClass={characterClass}
          showLabels={showLabels}
          activeView={view}
          slotMarkers={slotMarkers}
        />
      )}
      {view === 'snapgear' && hasAnomalies && (
        <Group gap="md" mt="sm">
          <LegendBadge status="alert" label={t('gear.legend_alert')} />
          <LegendBadge status="warning" label={t('gear.legend_warning')} />
        </Group>
      )}
    </ActivitySection>
  );
}
