import {
  Box,
  Button,
  Center,
  Container,
  Grid,
  Loader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLayoutList, IconSwords, IconUsersGroup } from '@tabler/icons-react';
import { isFeatureEnabled } from 'config/featureFlags';
import { useAuth, useDifficulty, useRealmAccess } from 'contexts';
import {
  useCharacterBossUpgrades,
  useCharacters,
  useCharacterSpecs,
  useCharacterWishlist,
  useCopyWishlistFromMutation,
  useUpdateWishlistItem,
  useWishlistStatus,
} from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { WishlistRecord } from 'types/character.types';
import { Permission } from 'types/permissions';
import { getQuerySlot, normalizeClass } from 'utils';
import { getItemLevelForDifficulty } from 'utils/getItemLevelForDifficulty';

import { CLASS_COLORS, CLASS_TO_ID } from '../../constants/classes';
import { RosterWishlistTable } from './components/RosterWishlistTable';
import { TalentTreeDrawer } from './components/TalentTree/TalentTreeDrawer';
import { WishlistBossView } from './components/WishlistBossView';
import { WishlistDrawer } from './components/WishlistDrawer';
import { WishlistHeader } from './components/WishlistHeader';
import { WishSlotInsights, WishSlotMarker } from './components/WishlistInsights';
import { WishlistPaperdoll } from './components/WishlistPaperdoll';
import { WishlistSlotList } from './components/WishlistSlotList';
import { SLOT_DETAILS } from './constants';
import classes from './WishlistPage.module.css';
import {
  buildItemSourceIndex,
  getNextEmptySlot,
  getSlotGroups,
  getSlotLabelKey,
  getSlotSuggestions,
  getWeaponSlots,
  getWishlistProgress,
} from './wishlistPlan';

declare global {
  interface Window {
    $WowheadPower?: {
      refreshLinks: () => void;
    };
  }
}

type WishlistView = 'slots' | 'boss' | 'roster';
const VIEWS: WishlistView[] = ['slots', 'boss', 'roster'];

function characterRender(thumbnail?: string | null, region?: string | null): string | undefined {
  if (!thumbnail) return undefined;
  const r = (region || 'eu').toLowerCase();
  return `https://render.worldofwarcraft.com/${r}/character/${thumbnail}`.replace(
    '-avatar.jpg',
    '-main-raw.png',
  );
}

/**
 * Wishlist (refonte SIMS-250) : en-tête (spé, progression, actions), puis trois
 * vues — emplacements (cœur de page, avec paperdoll compact), vœux par boss et
 * wishlists du roster. Le choix d'un objet passe par un tiroir guidé.
 */
export default function WishlistPage() {
  const { t } = useTranslation('wishlist');
  const { user, selectedCharacterId } = useAuth();
  const { hasPermission } = useRealmAccess();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [talentsOpen, setTalentsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { guild: realmParam, extension, season } = useRouteParams();
  const { difficulty, setDifficulty } = useDifficulty();

  const urlCharacterId = searchParams.get('characterId');
  const viewingCharacterId = urlCharacterId ? parseInt(urlCharacterId, 10) : selectedCharacterId;
  const urlSpecId = searchParams.get('specId');
  const urlView = searchParams.get('view') as WishlistView | null;
  const view: WishlistView = urlView && VIEWS.includes(urlView) ? urlView : 'slots';

  const { data: characters, isLoading: charactersLoading } = useCharacters();
  const linkedCharacters = user?.linkedCharacters || [];
  const viewedCharacter = characters?.find((c) => c.id === viewingCharacterId);
  const isOwnCharacter = linkedCharacters.some((c) => c.id === viewingCharacterId);
  const canManageWishlist = hasPermission(Permission.MANAGE_WISHLIST);
  const readOnly = !isOwnCharacter || !canManageWishlist;

  const selectedCharacter =
    viewedCharacter || linkedCharacters.find((c) => c.id === selectedCharacterId);
  const characterClass = selectedCharacter?.class;
  const classId = characterClass ? CLASS_TO_ID[normalizeClass(characterClass)] : undefined;
  const authCharacter = linkedCharacters.find((c) => c.id === selectedCharacterId);

  const { data: specs, isLoading: specsLoading } = useCharacterSpecs(viewingCharacterId);

  const activeSpecId = useMemo(() => {
    if (!specs || specs.length === 0) return null;
    const parsed = urlSpecId ? parseInt(urlSpecId, 10) : NaN;
    if (Number.isFinite(parsed) && specs.some((s) => s.id === parsed)) {
      return parsed;
    }
    const primary = specs.find((s) => s.isPrimary);
    return (primary ?? specs[0]).id;
  }, [specs, urlSpecId]);

  // Garde la spé affichée dans l'URL (lien partageable) ; aucun chargement ici.
  useEffect(() => {
    if (!activeSpecId) return;
    if (urlSpecId && parseInt(urlSpecId, 10) === activeSpecId) return;
    const next = new URLSearchParams(searchParams);
    next.set('specId', String(activeSpecId));
    setSearchParams(next, { replace: true });
  }, [activeSpecId, urlSpecId, searchParams, setSearchParams]);

  const activeSpec = useMemo(
    () => specs?.find((s) => s.id === activeSpecId) ?? null,
    [specs, activeSpecId],
  );
  const specName = activeSpec?.name ?? selectedCharacter?.specialization?.name;

  const { data: wishlist, isLoading: wishlistLoading } = useCharacterWishlist(
    viewingCharacterId,
    activeSpecId,
  );
  const wishlistRecord = useMemo(() => (wishlist ?? {}) as WishlistRecord, [wishlist]);
  const updateWishlist = useUpdateWishlistItem();
  const copyWishlist = useCopyWishlistFromMutation();

  // Wishlist enrichie (SIMS-205) : vœux à revoir, état, gains et suggestions.
  const showInsights = isFeatureEnabled('wishlist-insights');
  const showTalentTree = isFeatureEnabled('talent-tree');
  const { data: wishlistStatus } = useWishlistStatus(
    viewingCharacterId,
    activeSpecId,
    difficulty,
    showInsights,
  );

  // Butin des boss avec les gains de la spé affichée (SIMS-211) : provenance des
  // vœux, vue par boss et, sous `wishlist-insights`, gains et suggestions.
  const bossUpgrades = useCharacterBossUpgrades(activeSpecId ? viewingCharacterId : null, {
    difficulty,
    extension,
    season,
    specializationId: activeSpecId,
  });
  const bosses = bossUpgrades.data?.bosses;
  const sourceIndex = useMemo(() => buildItemSourceIndex(bosses), [bosses]);

  const slotGroups = useMemo(
    () => getSlotGroups(characterClass, wishlistRecord),
    [characterClass, wishlistRecord],
  );
  const slots = useMemo(() => slotGroups.flatMap((g) => g.slots), [slotGroups]);
  const progress = getWishlistProgress(characterClass, wishlistRecord);
  const slotLabel = (slot: string) =>
    t(getSlotLabelKey(slot, characterClass), { defaultValue: SLOT_DETAILS[slot]?.label ?? slot });

  const suggestions = useMemo(
    () =>
      showInsights && !readOnly
        ? getSlotSuggestions(bosses, slots, wishlistRecord, (slot) =>
            getQuerySlot(slot, characterClass, specName),
          )
        : undefined,
    [showInsights, readOnly, bosses, slots, wishlistRecord, characterClass, specName],
  );

  const obsoleteCount = showInsights
    ? Object.values(wishlistStatus?.slots ?? {}).filter((s) => s.obsolete).length
    : undefined;

  const slotMarkers = useMemo(() => {
    if (!showInsights) return undefined;
    const markers: Record<string, ReactNode> = {};
    for (const [slot, entry] of Object.entries(wishlistRecord)) {
      if (!entry?.itemId) continue;
      markers[slot] = <WishSlotMarker status={wishlistStatus?.slots[slot]} />;
    }
    return markers;
  }, [showInsights, wishlistRecord, wishlistStatus]);

  const itemLevel = getItemLevelForDifficulty(difficulty, extension, season);
  const firstEmptySlot = readOnly ? null : getNextEmptySlot(slots, wishlistRecord, null);
  const nextEmptySlot = selectedSlot ? getNextEmptySlot(slots, wishlistRecord, selectedSlot) : null;

  const setView = (next: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (!next || next === 'slots') params.delete('view');
    else params.set('view', next);
    setSearchParams(params, { replace: false });
  };

  const handleSpecChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('specId', value);
    setSearchParams(next, { replace: false });
    setSelectedSlot(null);
  };

  const backToMine =
    urlCharacterId && selectedCharacterId && viewingCharacterId !== selectedCharacterId
      ? () => {
          const next = new URLSearchParams(searchParams);
          next.delete('characterId');
          next.delete('specId');
          setSearchParams(next, { replace: false });
        }
      : undefined;

  const openSlot = (slot: string) => {
    if (readOnly) return;
    setTalentsOpen(false);
    setSelectedSlot(slot);
  };

  const refreshWowhead = () => {
    setTimeout(() => window.$WowheadPower?.refreshLinks(), 100);
  };

  const handleItemSelect = async (itemId: number): Promise<boolean> => {
    if (
      readOnly ||
      !viewingCharacterId ||
      !activeSpecId ||
      !selectedSlot ||
      updateWishlist.isPending
    ) {
      return false;
    }
    try {
      await updateWishlist.mutateAsync({
        characterId: viewingCharacterId,
        specializationId: activeSpecId,
        slot: selectedSlot,
        itemId,
        // L'objet choisi est le BiS de l'emplacement : plus d'échelle de priorité (SIMS-250).
        priority: 0,
      });
      refreshWowhead();
      return true;
    } catch (error) {
      console.error(error);
      notifications.show({
        title: t('notifications.update_error_title'),
        message: t('notifications.update_error_msg'),
        color: 'red',
      });
      return false;
    }
  };

  const handleRemoveItem = async () => {
    if (readOnly || !viewingCharacterId || !activeSpecId || !selectedSlot) return;
    try {
      await updateWishlist.mutateAsync({
        characterId: viewingCharacterId,
        specializationId: activeSpecId,
        slot: selectedSlot,
        itemId: null,
        priority: 0,
      });
      notifications.show({
        title: t('notifications.remove_success_title'),
        message: t('notifications.remove_success_msg'),
        color: 'blue',
      });
    } catch {
      notifications.show({
        title: t('notifications.remove_error_title'),
        message: t('notifications.remove_error_msg'),
        color: 'red',
      });
    }
  };

  const handleCopyFromSpec = async (sourceSpecId: number) => {
    if (readOnly || !viewingCharacterId || !activeSpecId) return;
    try {
      await copyWishlist.mutateAsync({
        characterId: viewingCharacterId,
        targetSpecializationId: activeSpecId,
        sourceId: viewingCharacterId,
        sourceSpecializationId: sourceSpecId,
      });
      notifications.show({ message: t('page.copy_success'), color: 'green' });
    } catch {
      notifications.show({ message: t('page.copy_error'), color: 'red' });
    }
  };

  if (!viewingCharacterId && linkedCharacters.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Center h="50vh">
          <Stack align="center">
            <Title order={2}>{t('no_characters_title')}</Title>
            <Text c="dimmed">{t('no_characters_desc')}</Text>
            <Button component="a" href="/sync">
              {t('link_character_btn')}
            </Button>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (charactersLoading || specsLoading || wishlistLoading) {
    return (
      <Container size="xl" py="xl">
        <Center h="50vh">
          <Loader />
        </Center>
      </Container>
    );
  }

  // Copie depuis la vue roster : vers sa propre wishlist affichée, sinon vers la
  // spé principale du personnage du compte (comportement d'avant SIMS-250).
  const rosterCopyTarget =
    !readOnly && viewingCharacterId && activeSpecId && characterClass
      ? {
          characterId: viewingCharacterId,
          characterClass,
          specializationId: activeSpecId,
          specName,
        }
      : authCharacter?.specialization?.id && canManageWishlist
        ? {
            characterId: authCharacter.id,
            characterClass: authCharacter.class,
            specializationId: authCharacter.specialization.id,
            specName: authCharacter.specialization.name,
          }
        : undefined;

  const accent = CLASS_COLORS[normalizeClass(characterClass || '')];

  return (
    <Container
      mt="xl"
      mb="xl"
      size="xl"
      className={classes.page}
      style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
    >
      <Stack gap="lg">
        <WishlistHeader
          character={selectedCharacter}
          readOnly={readOnly}
          onBackToMine={backToMine}
          specs={specs}
          activeSpecId={activeSpecId}
          onSpecChange={handleSpecChange}
          progress={progress}
          obsoleteCount={obsoleteCount}
          nextEmptySlotLabel={firstEmptySlot ? slotLabel(firstEmptySlot) : undefined}
          onContinue={
            firstEmptySlot
              ? () => {
                  setView('slots');
                  openSlot(firstEmptySlot);
                }
              : undefined
          }
          onOpenTalents={
            showTalentTree && viewingCharacterId && activeSpecId
              ? () => {
                  setSelectedSlot(null);
                  setTalentsOpen(true);
                }
              : undefined
          }
          onCopyFromSpec={readOnly ? undefined : handleCopyFromSpec}
          isCopying={copyWishlist.isPending}
        />

        <Tabs value={view} onChange={setView} keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="slots" leftSection={<IconLayoutList size={16} />}>
              {readOnly ? t('page.tabs.slots_read_only') : t('page.tabs.slots')}
            </Tabs.Tab>
            <Tabs.Tab value="boss" leftSection={<IconSwords size={16} />}>
              {t('page.tabs.by_boss')}
            </Tabs.Tab>
            <Tabs.Tab value="roster" leftSection={<IconUsersGroup size={16} />}>
              {t('page.tabs.roster')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="slots">
            <Grid gutter="lg" align="flex-start">
              <Grid.Col span={{ base: 12, lg: 8 }}>
                <WishlistSlotList
                  characterClass={characterClass}
                  groups={slotGroups}
                  wishlist={wishlistRecord}
                  selectedSlot={selectedSlot}
                  readOnly={readOnly}
                  onSelectSlot={openSlot}
                  sourceIndex={sourceIndex}
                  showInsights={showInsights}
                  statusBySlot={wishlistStatus?.slots}
                  snapshotOtherSpec={wishlistStatus?.snapshot?.sameSpec === false}
                  suggestions={suggestions}
                  difficulty={difficulty}
                  onDifficultyChange={setDifficulty}
                  itemLevel={itemLevel}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, lg: 4 }}>
                <Box style={{ position: 'sticky', top: 80 }}>
                  <WishlistPaperdoll
                    wishlist={wishlistRecord}
                    characterClass={characterClass}
                    characterImage={characterRender(
                      selectedCharacter?.thumbnail,
                      selectedCharacter?.region,
                    )}
                    weaponSlots={getWeaponSlots(characterClass, wishlistRecord)}
                    selectedSlot={selectedSlot}
                    readOnly={readOnly}
                    onSelectSlot={openSlot}
                    slotMarkers={slotMarkers}
                    itemLevel={itemLevel}
                  />
                </Box>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="boss">
            <Box component="section" className={classes.section} p={{ base: 'sm', sm: 'lg' }}>
              <Stack gap={0} mb="md">
                <Text fw={700}>{t('boss_view.title')}</Text>
                <Text size="xs" c="dimmed">
                  {t('boss_view.description')}
                </Text>
              </Stack>
              <WishlistBossView
                bosses={bosses}
                isLoading={bossUpgrades.isLoading}
                isError={bossUpgrades.isError}
                wishlist={wishlistRecord}
                slots={slots}
                characterClass={characterClass}
                showInsights={showInsights}
                statusBySlot={wishlistStatus?.slots}
                extension={extension}
                season={season}
                itemLevel={itemLevel}
              />
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="roster">
            <RosterWishlistTable
              region="eu"
              realm={realmParam!}
              copyTarget={rosterCopyTarget}
              viewingCharacterId={viewingCharacterId || undefined}
              ownCharacterIds={linkedCharacters.map((c) => c.id)}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {selectedSlot && !readOnly && (
        <WishlistDrawer
          slot={selectedSlot}
          slotLabel={slotLabel(selectedSlot)}
          progress={progress}
          wish={wishlistRecord[selectedSlot]}
          onClose={() => setSelectedSlot(null)}
          onSelect={handleItemSelect}
          onRemove={handleRemoveItem}
          querySlot={getQuerySlot(selectedSlot, characterClass, specName)}
          classId={classId}
          specName={specName}
          isSaving={updateWishlist.isPending}
          sourceIndex={sourceIndex}
          showGains={showInsights}
          difficultyLabel={t(`common:difficulties.${difficulty}`)}
          itemLevel={itemLevel}
          nextSlot={nextEmptySlot ? { slot: nextEmptySlot, label: slotLabel(nextEmptySlot) } : null}
          onNext={setSelectedSlot}
          insights={
            showInsights && viewingCharacterId && activeSpecId && extension && season ? (
              <WishSlotInsights
                characterId={viewingCharacterId}
                slot={selectedSlot}
                specializationId={activeSpecId}
                difficulty={difficulty}
                extension={extension}
                season={season}
                itemLevel={itemLevel}
                hasWish={wishlistRecord[selectedSlot]?.itemId != null}
                status={wishlistStatus?.slots[selectedSlot]}
                snapshotOtherSpec={wishlistStatus?.snapshot?.sameSpec === false}
                withAlternatives={false}
              />
            ) : undefined
          }
        />
      )}

      {showTalentTree && talentsOpen && viewingCharacterId && activeSpecId && (
        <TalentTreeDrawer
          characterId={viewingCharacterId}
          specializationId={activeSpecId}
          specName={specName}
          readOnly={readOnly}
          onClose={() => setTalentsOpen(false)}
        />
      )}
    </Container>
  );
}
