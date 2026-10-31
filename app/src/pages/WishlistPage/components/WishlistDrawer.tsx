import {
  Badge,
  Box,
  Button,
  Center,
  Drawer,
  Group,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowRight, IconCheck, IconSearch, IconTrash } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink';
import { useAvailableItems } from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import { type MouseEvent, type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WishlistSlotData } from 'types/character.types';
import { getQualityColor } from 'utils/qualityColors';

import classes from '../WishlistPage.module.css';
import {
  candidateBosses,
  type CandidateGain,
  type ItemSource,
  rankCandidates,
} from '../wishlistPlan';
import { GainText, SlotIcon } from './WishlistSlotList';

interface AvailableItem {
  id: number;
  icon: string;
  name: string;
  quality: number;
  itemLevel: number;
  bossName?: string | null;
}

interface WishlistDrawerProps {
  slot: string;
  slotLabel: string;
  /** Progression de la wishlist, rappelée sous le titre (« 4 / 16 »). */
  progress: { filled: number; total: number };
  wish?: WishlistSlotData;
  onClose: () => void;
  /** Enregistre l'objet choisi ; résolue une fois la wishlist à jour. */
  onSelect: (itemId: number) => Promise<boolean>;
  onRemove: () => void;
  querySlot?: string;
  classId?: number;
  specName?: string;
  isSaving?: boolean;
  /** Gains simulés par objet (SIMS-205) ; vide : candidats triés par nom. */
  sourceIndex: Map<number, ItemSource>;
  showGains: boolean;
  difficultyLabel: string;
  itemLevel?: number;
  /** Bloc de la wishlist enrichie (état du BiS choisi : SIMS-205). */
  insights?: ReactNode;
  /** Prochain emplacement vide ; `null` quand tout est renseigné. */
  nextSlot: { slot: string; label: string } | null;
  onNext: (slot: string) => void;
}

/**
 * Tiroir de choix d'un emplacement (SIMS-250) : vœu actuel, candidats triés par
 * gain simulé et filtrables par boss, puis « Suivant » vers le prochain
 * emplacement vide.
 */
export function WishlistDrawer(props: WishlistDrawerProps) {
  const { slot, slotLabel, progress, onClose } = props;
  const { t } = useTranslation('wishlist');
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <Drawer
      opened
      onClose={onClose}
      position="right"
      size={isMobile ? '100%' : 520}
      padding="md"
      overlayProps={{ backgroundOpacity: 0.35 }}
      classNames={{ content: classes.page }}
      title={
        <Stack gap={0}>
          <Text fw={700} size="lg">
            {t('drawer.select_title', { slot: slotLabel })}
          </Text>
          <Text size="xs" c="dimmed">
            {t('drawer_flow.progress', { filled: progress.filled, total: progress.total })}
          </Text>
        </Stack>
      }
      styles={{
        content: { display: 'flex', flexDirection: 'column' },
        body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* La clé remet recherche, filtre et confirmation à zéro à chaque emplacement. */}
      <DrawerBody key={slot} {...props} />
    </Drawer>
  );
}

function DrawerBody({
  slot,
  wish,
  onClose,
  onSelect,
  onRemove,
  querySlot,
  classId,
  specName,
  isSaving = false,
  sourceIndex,
  showGains,
  difficultyLabel,
  itemLevel,
  insights,
  nextSlot,
  onNext,
}: WishlistDrawerProps) {
  const { t } = useTranslation('wishlist');
  const { extension, season } = useRouteParams();
  const [search, setSearch] = useState('');
  const [boss, setBoss] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);

  const { data: availableItems, isLoading } = useAvailableItems(
    extension,
    season,
    querySlot || slot,
    classId,
    specName,
  );
  const items = useMemo(() => (availableItems ?? []) as AvailableItem[], [availableItems]);

  const gains = useMemo(() => {
    const map = new Map<number, CandidateGain>();
    if (!showGains) return map;
    for (const item of items) {
      const source = sourceIndex.get(item.id);
      if (source) map.set(item.id, source);
    }
    return map;
  }, [items, showGains, sourceIndex]);

  const bosses = useMemo(() => candidateBosses(items), [items]);
  const candidates = useMemo(
    () => rankCandidates(items, gains, { search, boss }),
    [items, gains, search, boss],
  );
  const currentId = wish?.itemId != null ? Number(wish.itemId) : null;
  const hasWish = currentId != null;

  const choose = async (itemId: number) => {
    if (isSaving) return;
    const saved = await onSelect(itemId);
    if (saved) setChosen(true);
  };

  const preventWowhead = (event: MouseEvent) => event.preventDefault();

  return (
    <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
      <Box className={classes.bossCard} p="sm">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
          {t('drawer_flow.current_title')}
        </Text>
        {hasWish ? (
          <Group gap="sm" wrap="nowrap">
            <SlotIcon
              icon={wish?.icon}
              quality={wish?.quality}
              itemId={currentId}
              itemLevel={itemLevel}
            />
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Text
                size="sm"
                fw={600}
                truncate
                style={{ color: getQualityColor(wish?.quality ?? 4) }}
              >
                {wish?.itemName ?? `#${currentId}`}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {sourceIndex.get(currentId)?.bossName ?? t('list.other_source')}
              </Text>
            </Stack>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={onRemove}
              disabled={isSaving}
            >
              {t('drawer.remove_btn')}
            </Button>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t('drawer_flow.current_none')}
          </Text>
        )}
        {hasWish && insights}
        {chosen && (
          <Group gap={6} c="teal.4">
            <IconCheck size={14} />
            <Text size="xs" c="teal.4">
              {t('drawer_flow.chosen')}
            </Text>
          </Group>
        )}
      </Box>

      <Stack gap={6}>
        <Group justify="space-between" align="baseline">
          <Text size="sm" fw={600}>
            {t('drawer_flow.candidates_title')}
          </Text>
          <Text size="xs" c="dimmed">
            {showGains
              ? t('drawer_flow.sorted_by_gain', { difficulty: difficultyLabel })
              : t('drawer_flow.sorted_by_name')}
          </Text>
        </Group>
        <Group gap="xs" wrap="wrap" align="flex-end">
          <TextInput
            placeholder={t('drawer.search_placeholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: '1 1 200px' }}
          />
          {bosses.length > 1 && (
            <Select
              style={{ flex: '1 1 160px' }}
              maw={220}
              clearable
              placeholder={t('drawer_flow.all_bosses')}
              aria-label={t('drawer_flow.boss_filter')}
              data={bosses}
              value={boss}
              onChange={setBoss}
              comboboxProps={{ zIndex: 1300 }}
            />
          )}
        </Group>
      </Stack>

      {isLoading ? (
        <Center py="xl" style={{ flex: 1 }}>
          <Loader />
        </Center>
      ) : (
        <ScrollArea style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
          <Stack gap={6}>
            {candidates.map((item) => {
              const gain = gains.get(item.id);
              const isCurrent = item.id === currentId;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={classes.candidate}
                  data-current={isCurrent || undefined}
                  data-disabled={isSaving || undefined}
                  aria-disabled={isSaving || undefined}
                  aria-pressed={isCurrent}
                  onClick={(event) => {
                    preventWowhead(event);
                    if (!isCurrent) choose(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    if (!isCurrent) choose(item.id);
                  }}
                >
                  <SlotIcon
                    icon={item.icon}
                    quality={item.quality}
                    itemId={item.id}
                    itemLevel={itemLevel}
                    size={36}
                  />
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <WowheadLink itemId={item.id} itemLevel={itemLevel}>
                      <Text
                        size="sm"
                        fw={600}
                        truncate
                        style={{ color: getQualityColor(item.quality) }}
                      >
                        {item.name}
                      </Text>
                    </WowheadLink>
                    <Text size="xs" c="dimmed" truncate>
                      {[item.bossName, itemLevel ? `ilvl ${itemLevel}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Stack>
                  {isCurrent && (
                    <Badge
                      size="sm"
                      variant="light"
                      color="brand"
                      style={{ flexShrink: 0, textTransform: 'none' }}
                    >
                      {t('drawer_flow.current_badge')}
                    </Badge>
                  )}
                  {showGains && (
                    <Box style={{ flexShrink: 0 }}>
                      <GainText gain={gain?.hasSimData ? (gain.dpsGain ?? null) : null} />
                    </Box>
                  )}
                </div>
              );
            })}
            {candidates.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                {t('drawer.no_items')}
              </Text>
            )}
          </Stack>
        </ScrollArea>
      )}

      <Group
        justify="space-between"
        gap="xs"
        pt="xs"
        style={{ borderTop: '1px solid var(--mantine-color-dark-5)' }}
      >
        <Text size="xs" c="dimmed">
          {nextSlot ? null : t('drawer_flow.all_filled')}
        </Text>
        {nextSlot ? (
          <Button
            variant={chosen ? 'filled' : 'default'}
            rightSection={<IconArrowRight size={16} />}
            onClick={() => onNext(nextSlot.slot)}
          >
            {t('drawer_flow.next_btn', { slot: nextSlot.label })}
          </Button>
        ) : (
          <Button variant={chosen ? 'filled' : 'default'} onClick={onClose}>
            {t('drawer_flow.done_btn')}
          </Button>
        )}
      </Group>
    </Stack>
  );
}
