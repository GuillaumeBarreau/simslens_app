import { Avatar, Tooltip } from '@mantine/core';
import { Text } from 'components/design-system/atoms';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import { useTranslation } from 'react-i18next';
import type { Character } from 'types/character.types';
import { getThumbnailUrl } from 'utils';

import { classColorClass, type ItemWishes, type PlayerWishes } from '../../droptimizerView';
import classes from '../../LootsOptimiserPage.module.css';
import {
  ItemChip,
  ItemLead,
  type LootItem,
  MoreChip,
  PlayerChip,
} from '../UpgradeChips/UpgradeChips';

const MAX_CHIPS = 8;

type WishlistViewProps = { itemLevel: number } & (
  | { groupBy: 'item'; entries: ItemWishes<LootItem, Character>[] }
  | { groupBy: 'player'; entries: PlayerWishes<LootItem, Character>[] }
);

function ItemWishesRow({
  entry,
  itemLevel,
}: {
  entry: ItemWishes<LootItem, Character>;
  itemLevel: number;
}) {
  const { t } = useTranslation('droptimizer');
  const { item, interested, owned } = entry;
  const visible = interested.slice(0, MAX_CHIPS);
  const hidden = interested.length - visible.length;
  const ownedSlots = Math.max(0, MAX_CHIPS - visible.length);
  const visibleOwned = owned.slice(0, ownedSlots);
  const hiddenOwned = owned.length - visibleOwned.length;

  return (
    <div className={classes.row}>
      <div className={classes.rowMain}>
        <ItemLead
          item={item}
          itemLevel={itemLevel}
          subtitle={
            <Text size="xs" c="dimmed" className={classes.num}>
              {t('row.wishers', { count: interested.length })}
              {owned.length > 0 && ` · ${t('row.owned', { count: owned.length })}`}
            </Text>
          }
        />
        <div className={classes.chips}>
          {visible.map(({ player, row, gain }) => (
            <PlayerChip
              key={player.id}
              name={player.name}
              playerClass={player.class}
              thumbnail={player.thumbnail}
              region={player.region}
              row={row}
              gain={gain}
              fallbackSpec={player.spec}
            />
          ))}
          {hidden > 0 && (
            <MoreChip label={t('row.more_players', { count: hidden })}>+{hidden}</MoreChip>
          )}
          {visibleOwned.map(({ player, row }) => (
            <PlayerChip
              key={`owned-${player.id}`}
              name={player.name}
              playerClass={player.class}
              thumbnail={player.thumbnail}
              region={player.region}
              row={row}
              owned
            />
          ))}
          {hiddenOwned > 0 && (
            <MoreChip
              label={t('row.owned_tooltip', {
                names: owned
                  .slice(visibleOwned.length)
                  .map(({ player }) => player.name)
                  .join(', '),
              })}
            >
              +{hiddenOwned}
            </MoreChip>
          )}
        </div>
        <span />
      </div>
    </div>
  );
}

function PlayerWishesRow({
  entry,
  itemLevel,
}: {
  entry: PlayerWishes<LootItem, Character>;
  itemLevel: number;
}) {
  const { t } = useTranslation('droptimizer');
  const specLabel = useSpecializationLabel();
  const { player, simulatedSpec, needed, obtained } = entry;
  const visible = needed.slice(0, MAX_CHIPS);
  const hidden = needed.length - visible.length;
  const obtainedSlots = Math.max(0, MAX_CHIPS - visible.length);
  const visibleObtained = obtained.slice(0, obtainedSlots);
  const hiddenObtained = obtained.length - visibleObtained.length;
  const spec = simulatedSpec
    ? t('loot_header.simulated_spec', { spec: specLabel(simulatedSpec) })
    : player.spec || t('row.no_spec');

  return (
    <div className={classes.row}>
      <div className={classes.rowMain}>
        <div className={classes.rowLead}>
          <Avatar
            src={
              getThumbnailUrl({ thumbnail: player.thumbnail, region: player.region }) || undefined
            }
            size={40}
            radius={6}
            alt={player.name}
          />
          <div style={{ minWidth: 0 }}>
            <Text fw={700} truncate="end" className={classColorClass(player.class)}>
              {player.name}
            </Text>
            <Tooltip label={spec} withArrow>
              <Text size="xs" c="dimmed" truncate="end" className={classes.num}>
                {t('row.needed', { count: needed.length })}
                {obtained.length > 0 && ` · ${t('row.obtained', { count: obtained.length })}`}
                {` · ${spec}`}
              </Text>
            </Tooltip>
          </div>
        </div>
        <div className={classes.chips}>
          {visible.map(({ item, row, gain }) => (
            <ItemChip
              key={item.id}
              item={item}
              itemLevel={itemLevel}
              gain={gain}
              metric={row.metric}
            />
          ))}
          {hidden > 0 && (
            <MoreChip label={t('row.more_items', { count: hidden })}>+{hidden}</MoreChip>
          )}
          {visibleObtained.map(({ item }) => (
            <ItemChip key={`owned-${item.id}`} item={item} itemLevel={itemLevel} owned />
          ))}
          {hiddenObtained > 0 && (
            <MoreChip label={t('row.more_items', { count: hiddenObtained })}>
              +{hiddenObtained}
            </MoreChip>
          )}
        </div>
        <span />
      </div>
    </div>
  );
}

function WishlistView(props: WishlistViewProps) {
  return (
    <div className={classes.list}>
      {props.groupBy === 'item'
        ? props.entries.map((entry) => (
            <ItemWishesRow key={entry.item.id} entry={entry} itemLevel={props.itemLevel} />
          ))
        : props.entries.map((entry) => (
            <PlayerWishesRow key={entry.player.id} entry={entry} itemLevel={props.itemLevel} />
          ))}
    </div>
  );
}

export { WishlistView };
