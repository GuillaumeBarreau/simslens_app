import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
import { IconArrowsMaximize, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { Drawer } from 'components/design-system/organisms/Drawer';
import { PlayerList, playerRowKey } from 'components/domain/tracking/PlayerList';
import { type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getQualityColor } from 'utils/qualityColors';
import { handleIconError, resolveBlizzardIcon } from 'utils/resolveIconPath';

import type { ItemGains } from '../../droptimizerView';
import classes from '../../LootsOptimiserPage.module.css';
import { ItemLead, type LootItem, MoreChip, PlayerChip } from '../UpgradeChips/UpgradeChips';

const MAX_CHIPS = 8;

function ItemGainsRow({ entry, itemLevel }: { entry: ItemGains<LootItem>; itemLevel: number }) {
  const { t } = useTranslation('droptimizer');
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [focus, setFocus] = useState<{ key: string; at: number } | null>(null);

  const toggleFromRow = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button, [role="button"]')) return;
    setExpanded((value) => !value);
  };

  const focusPlayer = (row: { name?: string | null; realm?: string | null }) => {
    setExpanded(true);
    setFocus({ key: playerRowKey(row), at: Date.now() });
  };
  const { item, interested, owned, rows } = entry;
  const visible = interested.slice(0, MAX_CHIPS);
  const hidden = interested.length - visible.length;

  const subtitle = (
    <Text size="xs" c="dimmed" className={classes.num}>
      {t('row.gainers', { count: interested.length })}
      {owned.length > 0 && (
        <Tooltip
          label={t('row.owned_tooltip', { names: owned.map((row) => row.name).join(', ') })}
          withArrow
          multiline
          maw={320}
        >
          <span> · {t('row.owned', { count: owned.length })}</span>
        </Tooltip>
      )}
    </Text>
  );

  const playerList = (maxHeight?: string) => (
    <PlayerList
      isPercent={false}
      upgrades={rows}
      loadingUpgrades={false}
      sourceItemId={item.id}
      sourceItemLevel={itemLevel}
      maxHeight={maxHeight}
      focus={focus}
    />
  );

  return (
    <div className={classes.row}>
      <div className={classes.rowMain} data-clickable onClick={toggleFromRow}>
        <ItemLead item={item} itemLevel={itemLevel} subtitle={subtitle} />
        <div className={classes.chips}>
          {visible.map(({ row, gain }) => (
            <PlayerChip
              key={`${row.characterId ?? row.name}-${row.realm ?? ''}`}
              name={row.name}
              playerClass={row.class}
              thumbnail={row.thumbnail}
              region={row.region}
              row={row}
              gain={gain}
              onClick={() => focusPlayer(row)}
            />
          ))}
          {hidden > 0 && (
            <MoreChip label={t('row.more_players', { count: hidden })}>+{hidden}</MoreChip>
          )}
        </div>
        <Group gap={4} wrap="nowrap">
          <Tooltip label={expanded ? t('row.hide_details') : t('row.details')} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              className={classes.toggle}
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? t('row.hide_details') : t('row.details')}
            >
              {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('row.fullscreen')} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setFullscreen(true)}
              aria-label={t('row.fullscreen')}
            >
              <IconArrowsMaximize size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
      {expanded && <div className={classes.rowDetail}>{playerList()}</div>}

      <Drawer
        opened={fullscreen}
        onClose={() => setFullscreen(false)}
        position="right"
        size="100%"
        styles={{ body: { height: 'calc(100% - 60px)', display: 'flex', flexDirection: 'column' } }}
        title={
          <Group gap="sm">
            <img
              src={resolveBlizzardIcon(item.icon)}
              onError={handleIconError(item.icon)}
              alt={item.name}
              style={{ width: 32, height: 32, borderRadius: 4 }}
            />
            <Title order={4} style={{ color: getQualityColor(item.quality ?? 1) }}>
              {item.name}
            </Title>
          </Group>
        }
      >
        {fullscreen && playerList('100%')}
      </Drawer>
    </div>
  );
}

export function GainsView({
  entries,
  itemLevel,
}: {
  entries: ItemGains<LootItem>[];
  itemLevel: number;
}) {
  return (
    <div className={classes.list}>
      {entries.map((entry) => (
        <ItemGainsRow key={entry.item.id} entry={entry} itemLevel={itemLevel} />
      ))}
    </div>
  );
}
