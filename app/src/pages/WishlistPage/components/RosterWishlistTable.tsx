import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCopy,
  IconEye,
  IconSearch,
  IconUsersGroup,
} from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { isFeatureEnabled } from 'config/featureFlags';
import {
  useCopyWishlistFromMutation,
  useRosterHiddenSpecWishlists,
  useRosterWishlists,
} from 'hooks/queries/useCharacterQueries';
import { useRouteParams } from 'hooks/useRouteParams';
import { useSpecializationLabel } from 'hooks/useSpecializationLabel';
import { type MouseEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getThumbnailUrl, normalizeClass } from 'utils';
import { getItemLevelForDifficulty } from 'utils/getItemLevelForDifficulty';
import { resolveBlizzardIcon } from 'utils/resolveIconPath';

import { SLOT_DETAILS } from '../constants';
import classes from '../WishlistPage.module.css';
import { getSlotGroups, getSlotLabelKey, getWishlistProgress } from '../wishlistPlan';
import {
  HiddenOnlyWishlistsAlert,
  HiddenSpecWishlistsHint,
  withoutShownWishlist,
} from './HiddenSpecWishlists';

/** Personnage qui reçoit une copie : le sien, dans la spé affichée. */
export interface RosterCopyTarget {
  characterId: number;
  characterClass: string;
  specializationId: number;
  specName?: string;
}

interface RosterWishlistTableProps {
  region: string;
  realm: string;
  copyTarget?: RosterCopyTarget;
  viewingCharacterId?: number;
  /** Personnage du compte connecté, mis en avant dans la liste. */
  ownCharacterIds?: number[];
}

interface RosterEntry {
  slot: string;
  itemId: number;
  itemName?: string;
  icon?: string;
  specializationId: number;
  character: {
    id: number;
    name: string;
    class: string;
    spec?: string | null;
    thumbnail?: string | null;
    region?: string | null;
    specializationId?: number | null;
  };
}

interface RosterCharacter {
  character: RosterEntry['character'];
  specializationId: number;
  itemsBySlot: Record<string, RosterEntry>;
  progress: { filled: number; total: number; percent: number };
}

type SortKey = 'class' | 'completion' | 'name';

type PendingCopy = { id: number; name: string; sourceSpecializationId: number };

/**
 * Vue roster des wishlists (SIMS-250) : une ligne lisible par personnage —
 * nom, spé, complétion — et ses objets en icônes avec infobulle.
 */
export function RosterWishlistTable({
  region,
  realm,
  copyTarget,
  viewingCharacterId,
  ownCharacterIds = [],
}: RosterWishlistTableProps) {
  const { t } = useTranslation('wishlist');
  const navigate = useNavigate();
  const { extension, season } = useRouteParams();
  const [searchParams] = useSearchParams();
  const { data: wishlists, isLoading } = useRosterWishlists(region, realm);
  // Wishlists d'autres spés, signalées au lieu d'être masquées (SIMS-212).
  const showHiddenSpecs = isFeatureEnabled('character-specializations');
  const { data: hiddenSpecWishlists } = useRosterHiddenSpecWishlists(
    region,
    realm,
    showHiddenSpecs,
  );
  const specializationLabel = useSpecializationLabel();
  const copyMutation = useCopyWishlistFromMutation();
  const [pendingCopy, setPendingCopy] = useState<PendingCopy | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('class');

  const characters = useMemo<RosterCharacter[]>(() => {
    const byId = new Map<number, Omit<RosterCharacter, 'progress'>>();
    for (const entry of (wishlists ?? []) as RosterEntry[]) {
      const current = byId.get(entry.character.id) ?? {
        character: entry.character,
        specializationId: entry.specializationId,
        itemsBySlot: {},
      };
      current.itemsBySlot[entry.slot] = entry;
      byId.set(entry.character.id, current);
    }
    return [...byId.values()].map((row) => ({
      ...row,
      progress: getWishlistProgress(row.character.class, row.itemsBySlot),
    }));
  }, [wishlists]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = characters.filter((c) => !query || c.character.name.toLowerCase().includes(query));
    return list.sort((a, b) => {
      if (sort === 'completion' && a.progress.filled !== b.progress.filled) {
        return b.progress.filled - a.progress.filled;
      }
      if (sort === 'class') {
        const byClass = (a.character.class || '').localeCompare(b.character.class || '');
        if (byClass !== 0) return byClass;
      }
      return (a.character.name || '').localeCompare(b.character.name || '');
    });
  }, [characters, search, sort]);

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  const hiddenByCharacter = new Map(
    (showHiddenSpecs ? (hiddenSpecWishlists ?? []) : []).map((entry) => [
      entry.character.id,
      entry,
    ]),
  );
  const hiddenOnly = withoutShownWishlist(
    showHiddenSpecs ? hiddenSpecWishlists : [],
    new Set(characters.map((c) => c.character.id)),
  );

  const itemLevel = getItemLevelForDifficulty('mythic', extension, season);
  const slotLabel = (slot: string, characterClass?: string) =>
    t(getSlotLabelKey(slot, characterClass), { defaultValue: SLOT_DETAILS[slot]?.label ?? slot });

  const viewWishlist = (characterId: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('characterId', String(characterId));
    next.delete('specId');
    next.delete('view');
    navigate(`?${next.toString()}`);
    window.scrollTo({ top: 0 });
  };

  const confirmCopy = () => {
    if (!copyTarget || !pendingCopy) return;
    copyMutation.mutate(
      {
        characterId: copyTarget.characterId,
        targetSpecializationId: copyTarget.specializationId,
        sourceId: pendingCopy.id,
        sourceSpecializationId: pendingCopy.sourceSpecializationId,
      },
      { onSuccess: () => setPendingCopy(null) },
    );
  };

  // Le clic sur une icône garde l'infobulle Wowhead sans ouvrir la page.
  const preventWowhead = (event: MouseEvent) => event.preventDefault();

  return (
    <Box component="section" className={classes.section} p={{ base: 'sm', sm: 'lg' }}>
      <Group justify="space-between" align="flex-start" gap="sm" mb="md">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <IconUsersGroup size={20} stroke={1.5} style={{ flexShrink: 0 }} />
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={700}>{t('roster.title')}</Text>
            <Text size="xs" c="dimmed">
              {t('roster.description')}
            </Text>
          </Stack>
        </Group>
        <Text size="xs" c="dimmed">
          {t('roster.characters_count', { count: characters.length })}
        </Text>
      </Group>

      {characters.length === 0 && hiddenOnly.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {t('roster.empty')}
        </Text>
      ) : (
        <Stack gap="md">
          <Group gap="sm" wrap="wrap" align="flex-end">
            <TextInput
              placeholder={t('roster.search_placeholder')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: '1 1 220px' }}
              maw={320}
            />
            <Group gap={8} wrap="nowrap" align="center">
              <Text size="xs" c="dimmed">
                {t('roster.sort_label')}
              </Text>
              <SegmentedControl
                size="xs"
                value={sort}
                onChange={(value) => setSort(value as SortKey)}
                data={(['class', 'completion', 'name'] as const).map((value) => ({
                  value,
                  label: t(`roster.sort.${value}`),
                }))}
              />
            </Group>
          </Group>

          {visible.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              {t('roster.no_match')}
            </Text>
          ) : (
            <div className={classes.slotList}>
              {visible.map(({ character, itemsBySlot, specializationId, progress }) => {
                const hiddenSpecs = hiddenByCharacter.get(character.id);
                const isOwn = ownCharacterIds.includes(character.id);
                const canCopy =
                  !!copyTarget &&
                  character.class === copyTarget.characterClass &&
                  character.id !== copyTarget.characterId &&
                  !!specializationId;
                const canView = character.id !== viewingCharacterId;
                const groups = getSlotGroups(character.class, itemsBySlot);
                return (
                  <div
                    key={character.id}
                    className={classes.rosterRow}
                    data-current={character.id === viewingCharacterId || undefined}
                  >
                    <div className={classes.rosterIdentity}>
                      <Avatar
                        src={
                          getThumbnailUrl({
                            thumbnail: character.thumbnail ?? undefined,
                            region: character.region ?? undefined,
                          }) ?? undefined
                        }
                        size={36}
                        radius="sm"
                        alt={character.name}
                      />
                      <Stack gap={0} style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                          <Text
                            fw={600}
                            size="sm"
                            truncate
                            className={`class-${normalizeClass(character.class)}`}
                          >
                            {character.name}
                          </Text>
                          {isOwn && (
                            <Badge size="xs" variant="default" style={{ textTransform: 'none' }}>
                              {t('roster.you')}
                            </Badge>
                          )}
                        </Group>
                        {character.specializationId ? (
                          <Text size="xs" c="dimmed" truncate>
                            {specializationLabel(character.spec)}
                          </Text>
                        ) : (
                          <Tooltip
                            label={t('roster_missing_spec_hint')}
                            withArrow
                            multiline
                            maw={260}
                          >
                            <Group gap={4} wrap="nowrap">
                              <IconAlertTriangle size={12} color="var(--mantine-color-yellow-6)" />
                              <Text size="xs" c="yellow">
                                {t('roster_missing_spec')}
                              </Text>
                            </Group>
                          </Tooltip>
                        )}
                        {hiddenSpecs && <HiddenSpecWishlistsHint entry={hiddenSpecs} />}
                      </Stack>
                    </div>

                    <Stack gap={4} className={classes.rosterCompletion}>
                      <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {t('page.progress_value', {
                          filled: progress.filled,
                          total: progress.total,
                        })}
                      </Text>
                      <Progress
                        value={progress.percent}
                        size="xs"
                        radius="xl"
                        color={progress.filled >= progress.total ? 'teal' : 'brand'}
                      />
                    </Stack>

                    <div className={classes.rosterIcons}>
                      {groups.map(({ group, slots }, index) => (
                        <Group key={group} gap={4} wrap="nowrap">
                          {index > 0 && <span className={classes.rosterGap} aria-hidden />}
                          {slots.map((slot) => {
                            const entry = itemsBySlot[slot];
                            const label = slotLabel(slot, character.class);
                            if (!entry) {
                              return (
                                <Tooltip
                                  key={slot}
                                  label={t('roster.slot_empty', { slot: label })}
                                  withArrow
                                >
                                  <span
                                    className={classes.rosterIcon}
                                    data-empty
                                    style={{
                                      backgroundImage: `url(${resolveBlizzardIcon(SLOT_DETAILS[slot]?.icon)})`,
                                    }}
                                  />
                                </Tooltip>
                              );
                            }
                            return (
                              <Tooltip
                                key={slot}
                                label={t('roster.slot_item', {
                                  slot: label,
                                  item: entry.itemName ?? `#${entry.itemId}`,
                                })}
                                withArrow
                              >
                                <span onClick={preventWowhead}>
                                  <WowheadLink
                                    itemId={entry.itemId}
                                    itemLevel={itemLevel}
                                    style={{ display: 'block' }}
                                  >
                                    <span
                                      className={classes.rosterIcon}
                                      role="img"
                                      aria-label={entry.itemName}
                                      style={{
                                        backgroundImage: `url(${resolveBlizzardIcon(entry.icon)})`,
                                      }}
                                    />
                                  </WowheadLink>
                                </span>
                              </Tooltip>
                            );
                          })}
                        </Group>
                      ))}
                    </div>

                    <Group gap={6} ml="auto" wrap="nowrap">
                      {canCopy && (
                        <Tooltip label={t('roster.copy')} withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            aria-label={t('roster.copy')}
                            onClick={() =>
                              setPendingCopy({
                                id: character.id,
                                name: character.name,
                                sourceSpecializationId: specializationId,
                              })
                            }
                            loading={
                              copyMutation.isPending &&
                              copyMutation.variables?.sourceId === character.id
                            }
                          >
                            <IconCopy size={18} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {canView && (
                        <Tooltip label={t('roster.view')} withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            aria-label={t('roster.view')}
                            onClick={() => viewWishlist(character.id)}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </div>
                );
              })}
            </div>
          )}

          <HiddenOnlyWishlistsAlert entries={hiddenOnly} />
        </Stack>
      )}

      <Modal
        opened={!!pendingCopy}
        onClose={() => setPendingCopy(null)}
        title={t('roster.confirm_copy_title')}
        centered
      >
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconAlertTriangle
              color="var(--mantine-color-yellow-6)"
              size={22}
              style={{ flexShrink: 0 }}
            />
            <Text size="sm">
              {t('roster.confirm_copy', {
                name: pendingCopy?.name,
                spec: specializationLabel(copyTarget?.specName),
              })}
            </Text>
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPendingCopy(null)}>
              {t('roster.cancel')}
            </Button>
            <Button loading={copyMutation.isPending} onClick={confirmCopy}>
              {t('roster.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
