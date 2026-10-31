import { ActionIcon, Badge, Box, Group, Menu, Progress, Table, Tooltip } from '@mantine/core';
import {
  IconBrandDiscord,
  IconCheck,
  IconDots,
  IconLink,
  IconListDetails,
  IconPencil,
  IconRefresh,
  IconTrash,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { EmptyState } from 'components/design-system/molecules';
import { DroptimizerUpdateModal } from 'components/domain/droptimizer';
import { isFeatureEnabled } from 'config/featureFlags';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import type { Character } from 'types/character.types';
import { normalizeClass } from 'utils';
import { RAIDBOTS_DROPTIMIZER_URL } from 'utils/droptimizer';

import classes from '../RosterPage.module.css';
import {
  type RosterSortKey,
  type StatusFilter,
  WISHLIST_DONE_THRESHOLD,
  WISHLIST_TOTAL_SLOTS,
  type WishlistCompletion,
  wishlistCount,
} from '../rosterView';
import { characterSubtitle, classColorClass } from './characterSubtitle';
import { RosterDiscordModal } from './RosterDiscordModal';

interface RosterTableProps {
  data: Character[];
  sortKey: RosterSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: RosterSortKey) => void;
  canEditAll: boolean;
  canEditSelf: boolean;
  currentUserId: string | number | undefined;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onApprove: (character: Character) => void;
  statusFilter: StatusFilter;
  isFiltered: boolean;
  realmId?: number;
  guildRealm?: string;
  wishlistCompletion: WishlistCompletion;
}

function WishlistCell({ count }: { count: number }) {
  const { t } = useTranslation('roster');
  if (count === 0) {
    return (
      <Tooltip label={t('page.wishlist.empty_hint')} withArrow>
        <Text size="xs" c="dimmed">
          {t('page.wishlist.empty')}
        </Text>
      </Tooltip>
    );
  }
  const done = count >= WISHLIST_DONE_THRESHOLD;
  return (
    <Tooltip
      label={t('page.wishlist.hint', { count, total: WISHLIST_TOTAL_SLOTS })}
      withArrow
      multiline
      maw={260}
    >
      <div className={classes.wishlist}>
        <Text size="sm" className={classes.num} c={done ? undefined : 'dimmed'}>
          {count}/{WISHLIST_TOTAL_SLOTS}
        </Text>
        <Progress
          className={classes.wishlistBar}
          value={(count / WISHLIST_TOTAL_SLOTS) * 100}
          color={done ? 'teal.6' : 'gray.6'}
          size={4}
          radius="xl"
          w={56}
        />
      </div>
    </Tooltip>
  );
}

interface AccountCellProps {
  character: Character;
  canEdit: boolean;
  onEditDiscord: (character: Character) => void;
}

function AccountCell({ character, canEdit, onEditDiscord }: AccountCellProps) {
  const { t } = useTranslation('roster');
  const linked = !!character.userId;
  const discord = !!character.hasDiscord;
  const discordContent = (
    <>
      <IconBrandDiscord
        size={13}
        stroke={1.5}
        color={discord ? 'var(--mantine-color-indigo-4)' : undefined}
      />
      {discord ? t('page.account.discord') : t('page.account.no_discord')}
    </>
  );
  const discordHint = discord ? t('page.account.discord_hint') : t('page.account.no_discord_hint');

  return (
    <div className={classes.accountBadges}>
      <Tooltip
        label={linked ? t('page.account.linked_hint') : t('page.account.not_linked_hint')}
        withArrow
        multiline
        maw={260}
      >
        <span className={classes.accountBadge} data-missing={!linked || undefined}>
          <IconLink
            size={13}
            stroke={1.5}
            color={linked ? 'var(--mantine-color-teal-4)' : undefined}
          />
          {linked ? t('page.account.linked') : t('page.account.not_linked')}
        </span>
      </Tooltip>
      <Tooltip
        label={canEdit ? `${discordHint} ${t('page.account.click_to_edit')}` : discordHint}
        withArrow
        multiline
        maw={260}
      >
        {canEdit ? (
          <button
            type="button"
            className={classes.accountButton}
            data-missing={!discord || undefined}
            onClick={() => onEditDiscord(character)}
          >
            {discordContent}
          </button>
        ) : (
          <span className={classes.accountBadge} data-missing={!discord || undefined}>
            {discordContent}
          </span>
        )}
      </Tooltip>
    </div>
  );
}

export const RosterTable: React.FC<RosterTableProps> = ({
  data,
  sortKey,
  sortDir,
  onSort,
  canEditAll,
  canEditSelf,
  currentUserId,
  onEdit,
  onDelete,
  onApprove,
  statusFilter,
  isFiltered,
  realmId,
  guildRealm,
  wishlistCompletion,
}) => {
  const { t } = useTranslation(['roster', 'tracking', 'common']);
  const { extension, guild } = useParams();
  const [discordTarget, setDiscordTarget] = useState<Character | null>(null);
  const [droptimizerTarget, setDroptimizerTarget] = useState<Character | null>(null);
  const closeDiscord = useCallback(() => setDiscordTarget(null), []);
  const showDroptimizer = isFeatureEnabled('droptimizer-update');

  if (data.length === 0) {
    let title = t('empty.roster_empty_title');
    let description = t('empty.roster_empty_desc');
    if (isFiltered) {
      title = t('empty.no_result_title');
      description = t('empty.no_result_desc');
    } else if (statusFilter === 'pending') {
      title = t('empty.backup_empty_title');
      description = t('empty.backup_empty_desc');
    } else if (statusFilter === 'guests') {
      title = t('page.empty.guests_title');
      description = t('page.empty.guests_desc');
    }
    return <EmptyState title={title} description={description} icon={IconUsersGroup} />;
  }

  const sortableHeader = (key: RosterSortKey, label: string, className?: string) => {
    const isSorted = sortKey === key;
    return (
      <Table.Th
        className={`${classes.sortable} ${className ?? ''}`}
        onClick={() => onSort(key)}
        aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <Text variant="section-label">
          {label} {isSorted ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </Text>
      </Table.Th>
    );
  };

  return (
    <>
      <div className={classes.table}>
        <Table withRowBorders={false} verticalSpacing={8} horizontalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {sortableHeader('name', t('page.table.character'))}
              <Table.Th className={classes.colAccount} visibleFrom="sm">
                <Text variant="section-label">{t('page.table.account')}</Text>
              </Table.Th>
              {sortableHeader('wishlist', t('page.table.wishlist'), classes.colWishlist)}
              <Table.Th className={classes.colActions}>
                <Text variant="section-label" ta="right">
                  {t('table.actions')}
                </Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((character) => {
              const canEditThis =
                canEditAll || (canEditSelf && String(character.userId) === String(currentUserId));
              const isPending = character.status === 'pending';
              return (
                <Table.Tr key={character.id}>
                  <Table.Td>
                    <Group gap={10} wrap="nowrap">
                      <div className={classes.icons}>
                        <img
                          src={`/src/character/class/${normalizeClass(character.class)}-icon.svg`}
                          alt={character.class}
                        />
                        {character.specialization?.name && (
                          <Box visibleFrom="sm" component="span" style={{ display: 'flex' }}>
                            <img
                              src={`/src/character/spec/${character.specialization.name.toLowerCase().replace(/ /g, '_')}_${character.class}.webp`}
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </Box>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                          <Text
                            fw={600}
                            size="sm"
                            className={classColorClass(character.class)}
                            truncate
                          >
                            {character.name}
                          </Text>
                          {character.isGuest && (
                            <Badge size="xs" variant="default" radius="sm">
                              {t('page.badges.guest')}
                            </Badge>
                          )}
                          {isPending && statusFilter !== 'pending' && (
                            <Badge size="xs" variant="light" color="orange" radius="sm">
                              {t('page.badges.pending')}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" truncate>
                          {characterSubtitle(character, t, guildRealm)}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>

                  <Table.Td visibleFrom="sm">
                    <AccountCell
                      character={character}
                      canEdit={canEditThis}
                      onEditDiscord={setDiscordTarget}
                    />
                  </Table.Td>

                  <Table.Td>
                    <WishlistCell count={wishlistCount(character, wishlistCompletion)} />
                  </Table.Td>

                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      {isPending && canEditAll && (
                        <>
                          <Tooltip label={t('table.approve')} withArrow>
                            <ActionIcon
                              variant="light"
                              color="teal"
                              size="md"
                              aria-label={t('table.approve')}
                              onClick={() => onApprove(character)}
                            >
                              <IconCheck size={16} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t('table.reject')} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="md"
                              aria-label={t('table.reject')}
                              onClick={() => onDelete(character)}
                            >
                              <IconX size={16} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                        </>
                      )}
                      {!isPending && canEditThis && (
                        <Tooltip label={t('table.edit')} withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="md"
                            aria-label={t('table.edit')}
                            onClick={() => onEdit(character)}
                          >
                            <IconPencil size={16} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Menu position="bottom-end" withinPortal shadow="md">
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="md"
                            aria-label={t('page.table.more', { name: character.name })}
                          >
                            <IconDots size={16} stroke={1.5} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {isPending && canEditThis && (
                            <Menu.Item
                              leftSection={<IconPencil size={16} stroke={1.5} />}
                              onClick={() => onEdit(character)}
                            >
                              {t('table.edit')}
                            </Menu.Item>
                          )}
                          <Menu.Item
                            component={Link}
                            to={`/${guild}/${extension}/wishlist?characterId=${character.id}`}
                            leftSection={<IconListDetails size={16} stroke={1.5} />}
                          >
                            {t('table.view_wishlist')}
                          </Menu.Item>
                          {showDroptimizer && (
                            <Menu.Item
                              leftSection={<IconRefresh size={16} stroke={1.5} />}
                              onClick={() => {
                                window.open(
                                  RAIDBOTS_DROPTIMIZER_URL,
                                  '_blank',
                                  'noopener,noreferrer',
                                );
                                setDroptimizerTarget(character);
                              }}
                            >
                              {t('tracking:droptimizer_update.button')}
                            </Menu.Item>
                          )}
                          {canEditThis && (
                            <Menu.Item
                              leftSection={<IconBrandDiscord size={16} stroke={1.5} />}
                              onClick={() => setDiscordTarget(character)}
                            >
                              {t('table.edit_discord')}
                            </Menu.Item>
                          )}
                          {canEditThis && !isPending && (
                            <>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={16} stroke={1.5} />}
                                onClick={() => onDelete(character)}
                              >
                                {t('page.table.remove')}
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>

      <RosterDiscordModal
        character={discordTarget}
        currentUserId={currentUserId}
        realmId={realmId}
        onClose={closeDiscord}
      />
      {showDroptimizer && (
        <DroptimizerUpdateModal
          opened={droptimizerTarget !== null}
          onClose={() => setDroptimizerTarget(null)}
          characterName={droptimizerTarget?.name ?? ''}
        />
      )}
    </>
  );
};
