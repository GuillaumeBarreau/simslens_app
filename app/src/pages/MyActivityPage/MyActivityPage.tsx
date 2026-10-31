import { Button, Container, Grid, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserQuestion } from '@tabler/icons-react';
import { DroptimizerUpdateButton } from 'components/domain/droptimizer';
import { isFeatureEnabled } from 'config/featureFlags';
import { CLASS_COLORS } from 'constants/classes';
import { useAuth } from 'contexts';
import { useRealmAccess } from 'contexts/RealmAccessContext';
import dayjs from 'dayjs';
import {
  useCharacterEnchantVerify,
  useCharacters,
  useCharacterWishlist,
  useDungeonGroupsWeek,
  useEvents,
  useUserRealm,
} from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import { useSimStaleAfterDays } from 'hooks/useSimStaleAfterDays';
import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { DungeonGroup } from 'services/dungeonGroup.service';
import { normalizeClass } from 'utils';

import {
  anomaliesBySlot,
  characterRenderUrl,
  computeGearTodo,
  computeRaidTodo,
  computeSimTodo,
  computeWishlistTodo,
  resolveActivityCharacter,
} from './activitySummary';
import { ActivityBossUpgradesSection } from './components/ActivityBossUpgradesSection';
import { ActivityCharacterHeader } from './components/ActivityCharacterHeader';
import { ActivityDungeonGroupsSection } from './components/ActivityDungeonGroupsSection';
import { ActivityGearSection, type GearView } from './components/ActivityGearSection';
import { ActivityRaidsSection } from './components/ActivityRaidsSection';
import { ActivityEmptyState, ActivitySection } from './components/ActivitySection';
import { ActivitySettingsDrawer } from './components/ActivitySettingsDrawer';
import { ActivityTodoStrip, type TodoTarget } from './components/ActivityTodoStrip';
import classes from './MyActivityPage.module.css';

/** Ancres des sections visées par le bandeau « À faire ». */
const ANCHORS = {
  upgrades: 'activity-upgrades',
  gear: 'activity-gear',
  raids: 'activity-raids',
} as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function MyActivityPage() {
  const { t } = useTranslation(['myActivity', 'common']);
  const navigate = useNavigate();
  const { guild, extension } = useRouteParams();
  const { role } = useRealmAccess();
  const { user, selectedCharacterId } = useAuth();
  const isGuest = role === 'guest';

  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const realmId = realmData?.id || 0;

  const { data: characters = [] } = useCharacters(realmId);
  const character = useMemo(
    () => resolveActivityCharacter(characters, user?.linkedCharacters, selectedCharacterId),
    [characters, user?.linkedCharacters, selectedCharacterId],
  );
  const characterClass = normalizeClass(character?.class || '');

  const characterImage =
    characterRenderUrl(character?.thumbnail, character?.region, 'main-raw') ??
    '/src/default-character.png';

  const primarySpecId = character?.specializationId ? Number(character.specializationId) : null;

  const { data: wishlist, isLoading: wishlistLoading } = useCharacterWishlist(
    selectedCharacterId,
    primarySpecId,
  );

  const eventFilters = useMemo(
    () => ({
      realmId,
      startDate: dayjs().startOf('day').format('YYYY-MM-DDTHH:mm:ss[Z]'),
      endDate: dayjs().add(7, 'day').endOf('day').format('YYYY-MM-DDTHH:mm:ss[Z]'),
      status: 'SCHEDULED' as const,
    }),
    [realmId],
  );
  const { data: events = [] } = useEvents(eventFilters);

  const { weekStart, weekEnd } = useMemo(() => {
    const today = dayjs();
    const dow = today.day();
    const monday = today.subtract(dow === 0 ? 6 : dow - 1, 'day');
    return {
      weekStart: monday.format('YYYY-MM-DD'),
      weekEnd: monday.add(6, 'day').format('YYYY-MM-DD'),
    };
  }, []);

  const { data: allDungeonGroups = [] } = useDungeonGroupsWeek(realmId, weekStart, weekEnd);

  const myDungeonGroups = useMemo(
    () =>
      user?.id
        ? allDungeonGroups.filter((g: DungeonGroup) =>
            g.members.some((m) => String(m.userId) === String(user.id)),
          )
        : [],
    [allDungeonGroups, user?.id],
  );

  const { data: enchantVerify } = useCharacterEnchantVerify(selectedCharacterId);

  const showSim = isFeatureEnabled('sim-freshness');
  const staleAfterDays = useSimStaleAfterDays(showSim);
  const raidTodo = computeRaidTodo(events, selectedCharacterId);
  const simTodo = computeSimTodo(character, Date.now(), staleAfterDays);
  const gearTodo = useMemo(() => computeGearTodo(enchantVerify), [enchantVerify]);
  const gearAnomalies = useMemo(() => anomaliesBySlot(gearTodo.anomalies), [gearTodo]);
  const wishlistTodo = computeWishlistTodo(primarySpecId ? wishlist : undefined);

  const [gearView, setGearView] = useState<GearView>('snapgear');
  const [settingsOpened, settings] = useDisclosure(false);
  const showSpecializations = isFeatureEnabled('character-specializations');
  const showCalendarFeed = isFeatureEnabled('calendar-feed');
  const hasSettings = showSpecializations || showCalendarFeed;

  const openWishlist = () => navigate(`/${guild}/${extension}/wishlist`);

  const handleTodo = (target: TodoTarget) => {
    if (target === 'raids') scrollToSection(ANCHORS.raids);
    else if (target === 'sim') scrollToSection(ANCHORS.upgrades);
    else if (target === 'gear') {
      setGearView('snapgear');
      scrollToSection(ANCHORS.gear);
    } else if (isGuest) {
      // La page wishlist est fermée aux invités : on montre leur wishlist ici.
      setGearView('wishlist');
      scrollToSection(ANCHORS.gear);
    } else {
      openWishlist();
    }
  };

  const pageStyle = {
    '--accent': CLASS_COLORS[characterClass] ?? 'var(--mantine-color-brand-5)',
  } as CSSProperties;

  if (!selectedCharacterId) {
    return (
      <Container size="xl" py="xl" className={classes.page} style={pageStyle}>
        <ActivitySection icon={<IconUserQuestion size={20} />} title={t('subtitle')}>
          <ActivityEmptyState
            icon={<IconUserQuestion size={26} stroke={1.5} />}
            title={t('no_character_title')}
            text={t('no_character')}
            action={
              <Button variant="light" color="brand.5" onClick={() => navigate('/sync')}>
                {t('common:navigation.sync_characters')}
              </Button>
            }
          />
        </ActivitySection>
      </Container>
    );
  }

  const updateButton = character ? (
    <DroptimizerUpdateButton
      variant="full"
      characterName={character.name}
      mythicReport={character.reportsByDifficulty?.mythic}
      staleAfterDays={staleAfterDays}
    />
  ) : undefined;

  return (
    <Container size="xl" py="xl" className={classes.page} style={pageStyle}>
      <Stack gap="lg">
        <ActivityCharacterHeader
          character={character}
          sim={simTodo}
          staleAfterDays={staleAfterDays}
          onOpenWishlist={isGuest ? undefined : openWishlist}
          onOpenSettings={hasSettings ? settings.open : undefined}
        />

        <ActivityTodoStrip
          raids={raidTodo}
          sim={simTodo}
          gear={gearTodo}
          wishlist={wishlistTodo}
          showSim={showSim}
          onSelect={handleTodo}
        />

        <Grid gutter="lg" align="stretch">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <ActivityGearSection
              id={ANCHORS.gear}
              characterId={selectedCharacterId}
              characterClass={character?.class}
              characterImage={characterImage}
              wishlist={wishlist}
              wishlistLoading={wishlistLoading}
              anomaliesBySlot={gearAnomalies}
              view={gearView}
              onViewChange={setGearView}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg" h="100%" className={classes.fillColumn}>
              <ActivityRaidsSection
                id={ANCHORS.raids}
                events={events}
                selectedCharacterId={selectedCharacterId}
                realmId={realmId}
              />
              <ActivityDungeonGroupsSection
                groups={myDungeonGroups}
                characters={characters}
                userId={user?.id}
              />
            </Stack>
          </Grid.Col>
        </Grid>

        <ActivityBossUpgradesSection
          id={ANCHORS.upgrades}
          characterId={selectedCharacterId}
          specializationId={primarySpecId}
          region={character?.region ?? undefined}
          reportsByDifficulty={character?.reportsByDifficulty}
          emptyAction={updateButton}
        />
      </Stack>

      {hasSettings && (
        <ActivitySettingsDrawer
          opened={settingsOpened}
          onClose={settings.close}
          characterId={selectedCharacterId}
          showSpecializations={showSpecializations}
          showCalendarFeed={showCalendarFeed}
        />
      )}
    </Container>
  );
}
