import { Avatar, Tooltip } from '@mantine/core';
import { SimMetricBadge } from 'components/domain/droptimizer/SimMetricBadge';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpgradeBatchRow } from 'types/upgrade.types';
import { getThumbnailUrl } from 'utils';
import { getQualityColor } from 'utils/qualityColors';
import { handleIconError, resolveBlizzardIcon } from 'utils/resolveIconPath';
import { simulatedSpecName } from 'utils/simulatedSpecialization';

import { classColorClass, formatGain, gainSign } from '../../droptimizerView';
import classes from '../../LootsOptimiserPage.module.css';

export interface LootItem {
  id: number;
  name: string;
  icon: string;
  quality?: number | string | null;
}

export function GainValue({ gain }: { gain: number | null }) {
  const { t } = useTranslation('droptimizer');
  const value = (
    <span className={classes.gain} data-sign={gainSign(gain)}>
      {formatGain(gain)}
    </span>
  );
  if (gain !== null) return value;
  return (
    <Tooltip label={t('row.gain_unknown')} withArrow>
      {value}
    </Tooltip>
  );
}

interface PlayerChipProps {
  name: string;
  playerClass?: string | number;
  thumbnail?: string | null;
  region?: string | null;
  row?: UpgradeBatchRow | null;
  gain?: number | null;
  owned?: boolean;
  fallbackSpec?: string | null;
  onClick?: () => void;
}

export function PlayerChip({
  name,
  playerClass,
  thumbnail,
  region,
  row,
  gain,
  owned,
  fallbackSpec,
  onClick,
}: PlayerChipProps) {
  const { t } = useTranslation('droptimizer');
  const specLabel = useSpecializationLabel();
  const simSpec = simulatedSpecName(row);
  const label = simSpec
    ? t('loot_header.player_simulated_spec', { name, spec: specLabel(simSpec) })
    : fallbackSpec
      ? `${name} — ${fallbackSpec}`
      : name;

  return (
    <Tooltip label={label} withArrow>
      <span
        className={classes.chip}
        data-owned={owned || undefined}
        data-clickable={onClick ? true : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={
          onClick
            ? (event) => {
                event.stopPropagation();
                onClick();
              }
            : undefined
        }
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  onClick();
                }
              }
            : undefined
        }
      >
        <Avatar
          src={
            getThumbnailUrl({ thumbnail: thumbnail ?? undefined, region: region ?? undefined }) ||
            undefined
          }
          size={24}
          radius={4}
          alt=""
        />
        <span className={`${classes.chipName} ${classColorClass(playerClass)}`}>{name}</span>
        {!owned && gain !== undefined && <GainValue gain={gain} />}
        {!owned && <SimMetricBadge metric={row?.metric} />}
      </span>
    </Tooltip>
  );
}

export function ItemChip({
  item,
  itemLevel,
  gain,
  metric,
  owned,
}: {
  item: LootItem;
  itemLevel: number;
  gain?: number | null;
  metric?: string | null;
  owned?: boolean;
}) {
  return (
    <span className={classes.chip} data-owned={owned || undefined}>
      <WowheadLink itemId={item.id} itemLevel={itemLevel} region="eu">
        <img
          src={resolveBlizzardIcon(item.icon)}
          onError={handleIconError(item.icon)}
          alt=""
          className={classes.chipIcon}
        />
      </WowheadLink>
      <span className={classes.chipName} style={{ color: getQualityColor(item.quality ?? 1) }}>
        {item.name}
      </span>
      {!owned && gain !== undefined && <GainValue gain={gain} />}
      {!owned && <SimMetricBadge metric={metric} />}
    </span>
  );
}

export function MoreChip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip label={label} withArrow>
      <span className={classes.more}>{children}</span>
    </Tooltip>
  );
}

export function ItemLead({
  item,
  itemLevel,
  subtitle,
}: {
  item: LootItem;
  itemLevel: number;
  subtitle: ReactNode;
}) {
  return (
    <div className={classes.rowLead}>
      <WowheadLink itemId={item.id} itemLevel={itemLevel} region="eu">
        <img
          src={resolveBlizzardIcon(item.icon)}
          onError={handleIconError(item.icon)}
          alt={item.name}
          className={classes.itemIcon}
        />
      </WowheadLink>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: getQualityColor(item.quality ?? 1),
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        {subtitle}
      </div>
    </div>
  );
}
