import { Box, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ConfirmModal } from 'components/design-system/organisms';
import { isFeatureEnabled } from 'config/featureFlags';
import { useAuth, useRealmAccess } from 'contexts';
import {
  useBossesByRaid,
  useEvent,
  useGuestAssignments,
  useRosterPool,
  useToggleGuestAssignment,
  useUserRealm,
} from 'hooks/queries';
import {
  useAssignToRoster,
  useImportRosterFromEvent,
  usePastRosters,
  useRemoveFromRoster,
  useReplaceRosterHolder,
  useRosterReplacements,
} from 'hooks/queries/useRosterQueries';
import { useRouteParams } from 'hooks/useRouteParams';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { characterService } from 'services/character.service';
import type {
  PoolCharacter,
  RosterAssignment,
  RosterReplacement,
  RosterVacancy,
} from 'services/roster.service';
import { rosterService } from 'services/roster.service';
import { Permission } from 'types/permissions';
import { resolveIconPath } from 'utils/resolveIconPath';

import {
  EventRosterHeader,
  EventRosterSkeleton,
  GenerateCompositionModal,
  ImportRosterModal,
  RosterSummaryView,
  RosterVacancyAlert,
  vacancyKey,
} from './components';
import { BossNotesDrawer } from './components/BossNotes';
import { RosterMatrixTable } from './components/RosterMatrixTable';

const ROLES = {
  TANK: 'TANK',
  HEALER: 'HEALER',
  MELEE: 'MELEE',
  RANGED: 'RANGED',
} as const;

type RoleType = (typeof ROLES)[keyof typeof ROLES];

export default function EventRosterPage() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const { extension: routeExtension, season: routeSeason } = useRouteParams();
  const { user } = useAuth();
  const { hasPermission } = useRealmAccess();
  const canEdit = hasPermission(Permission.MANAGE_EVENT_ROSTER);
  const showVacancies = canEdit && isFeatureEnabled('roster-replacements');
  const showBossNotes = isFeatureEnabled('boss-notes');
  const [notesOpen, setNotesOpen] = useState(false);
  const { t } = useTranslation('eventRoster');
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null);
  const parsedEventId = eventId ? parseInt(eventId) : null;
  const realmId = realmData?.id || 0;

  const { data: event, isLoading: eventLoading } = useEvent(parsedEventId, realmId);

  const extension = event?.raid_difficulty?.raid?.extension || routeExtension;
  const season = event?.raid_difficulty?.raid?.season || routeSeason;

  const { data: allBosses = [] } = useBossesByRaid(extension, season);

  const bosses = useMemo(() => {
    return allBosses
      .filter((boss) => boss.name !== 'Bind on Equip')
      .map((boss) => ({
        id: boss.id,
        name: boss.name,
        icon: resolveIconPath(boss.icon ?? undefined, extension, season),
      }));
  }, [allBosses, extension, season]);

  const [bossOrder, setBossOrder] = useState<number[] | null>(null);

  useEffect(() => {
    if (bosses.length === 0 || !parsedEventId) return;
    const saved = localStorage.getItem(`boss-order-${parsedEventId}`);
    if (saved) {
      try {
        const parsed: number[] = JSON.parse(saved);
        const valid = parsed.filter((id) => bosses.some((b) => b.id === id));
        const missing = bosses.filter((b) => !valid.includes(b.id)).map((b) => b.id);
        setBossOrder([...valid, ...missing]);
      } catch {
        setBossOrder(bosses.map((b) => b.id));
      }
    } else {
      setBossOrder(bosses.map((b) => b.id));
    }
  }, [bosses, parsedEventId]);

  const orderedBosses = useMemo(() => {
    if (!bossOrder) return bosses;
    return bossOrder.map((id) => bosses.find((b) => b.id === id)).filter(Boolean) as typeof bosses;
  }, [bosses, bossOrder]);

  const moveBoss = useCallback(
    (bossId: number, direction: 'left' | 'right') => {
      setBossOrder((prev) => {
        if (!prev) return prev;
        const idx = prev.indexOf(bossId);
        if (idx === -1) return prev;
        const next = [...prev];
        if (direction === 'left' && idx > 0) {
          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        } else if (direction === 'right' && idx < next.length - 1) {
          [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
        }
        if (parsedEventId)
          localStorage.setItem(`boss-order-${parsedEventId}`, JSON.stringify(next));
        return next;
      });
    },
    [parsedEventId],
  );

  const rosterQueries = useQueries({
    queries: bosses.map((boss) => ({
      queryKey: ['event-roster', parsedEventId, realmId, boss.id],
      queryFn: () => rosterService.getRoster(parsedEventId!, realmId, boss.id),
      enabled: !!parsedEventId && !!realmId && !!boss.id,
      refetchInterval: 3000,
    })),
  });

  const [viewMode, setViewMode] = useState<'MATRIX' | 'SUMMARY'>(
    searchParams.get('view') === 'summary' ? 'SUMMARY' : canEdit ? 'MATRIX' : 'SUMMARY',
  );
  const isLoadingRosters = rosterQueries.some((q) => q.isLoading);

  const aggregatedAssignments = useMemo(() => {
    const all: RosterAssignment[] = [];
    rosterQueries.forEach((q) => {
      if (q.data) {
        const data = q.data;
        const assignments = [
          ...(data.tanks || []),
          ...(data.healers || []),
          ...(data.melee || []),
          ...(data.ranged || []),
        ];
        all.push(...assignments);
      }
    });
    return all;
  }, [rosterQueries]);

  const { data: poolData = [], isLoading: poolLoading } = useRosterPool(
    parsedEventId,
    realmId,
    null,
  );

  const difficultyKey = event?.raid_difficulty?.difficulty_rel?.name?.toLowerCase() || 'heroic';

  const { data: fullRoster = [], isLoading: rosterLoading } = useQuery({
    queryKey: ['characters', 'roster', difficultyKey, realmId],
    queryFn: () => characterService.getRoster(difficultyKey, realmId),
    enabled: !!event && !!realmId,
  });

  const allPlayersInView = useMemo(() => {
    const playerMap = new Map<number, PoolCharacter>();

    fullRoster.forEach((char) => {
      playerMap.set(char.id, {
        ...char,
        signupStatus: 'ABSENT', // Default for those not in the event pool
        isSignee: false,
        disabled: true, // Everyone is "dimmed/absent" by default
      });
    });

    poolData.forEach((poolChar) => {
      const existing = playerMap.get(poolChar.id);
      playerMap.set(poolChar.id, {
        ...existing,
        ...poolChar,
        isSignee: true,
        disabled: false,
      });
    });

    aggregatedAssignments.forEach((assignment) => {
      const charId = assignment.characterId;
      const existing = playerMap.get(charId);
      if (existing) {
        playerMap.set(charId, {
          ...existing,
          isSignee: true,
          disabled: false,
        });
      }
    });

    return Array.from(playerMap.values());
  }, [fullRoster, poolData, aggregatedAssignments]);

  const assignToRoster = useAssignToRoster();
  const removeFromRoster = useRemoveFromRoster();
  const toggleGuestAssignment = useToggleGuestAssignment();
  const { data: guestAssignments = [] } = useGuestAssignments(parsedEventId, realmId);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const { data: pastRosters = [], isLoading: pastRostersLoading } = usePastRosters(
    importModalOpen ? parsedEventId : null,
    realmId,
  );
  const importRoster = useImportRosterFromEvent(parsedEventId ?? 0, realmId);

  // Vivier et placements, tous deux rafraîchis toutes les 3 s : les
  // remplaçants sont recalculés dès que l'un ou l'autre change, y compris
  // quand un autre officier modifie le roster.
  const rosterSignature = useMemo(() => {
    const pool = poolData.map((c) => `${c.id}:${c.signupStatus}`).sort();
    const placed = aggregatedAssignments.map((a) => `${a.bossId}:${a.characterId}`).sort();
    return `${pool.join(',')}|${placed.join(',')}`;
  }, [poolData, aggregatedAssignments]);
  const { data: vacancies = [] } = useRosterReplacements(
    parsedEventId,
    realmId,
    rosterSignature,
    showVacancies && !poolLoading && !isLoadingRosters,
  );
  const replaceHolder = useReplaceRosterHolder(parsedEventId, realmId);
  const [pendingVacancyKey, setPendingVacancyKey] = useState<string | null>(null);
  const bossNames = useMemo(() => new Map(bosses.map((b) => [b.id, b.name])), [bosses]);

  const handleReplace = useCallback(
    (vacancy: RosterVacancy, replacement: RosterReplacement) => {
      setPendingVacancyKey(vacancyKey(vacancy));
      replaceHolder.mutate(
        { vacancy, replacementId: replacement.characterId },
        {
          onSuccess: () =>
            notifications.show({
              color: 'green',
              message: t('vacancies.replaced', {
                replacement: replacement.name,
                name: vacancy.characterName,
                boss: bossNames.get(vacancy.bossId) ?? `#${vacancy.bossId}`,
              }),
            }),
          onError: () => notifications.show({ color: 'red', message: t('vacancies.replaceError') }),
          onSettled: () => setPendingVacancyKey(null),
        },
      );
    },
    [replaceHolder, bossNames, t],
  );

  const [pendingAssignment, setPendingAssignment] = useState<{
    characterId: number;
    bossId: number | null;
    targetRole: RoleType;
    characterName: string;
    assignAll?: boolean;
  } | null>(null);

  const handleGuestToggle = useCallback(
    (guestId: number, bossId: number, targetRole: RoleType | null) => {
      toggleGuestAssignment.mutate({
        eventId: parsedEventId!,
        guestId,
        bossId,
        realmId,
        role: targetRole,
      });
    },
    [parsedEventId, realmId, toggleGuestAssignment],
  );

  const executeAssignment = useCallback(
    (characterId: number, bossId: number, targetRole: RoleType | null) => {
      const character = allPlayersInView.find((p) => p.id === characterId);
      const existingAssignment = aggregatedAssignments.find(
        (a) => a.characterId === characterId && a.bossId === bossId,
      );

      if (existingAssignment) {
        removeFromRoster.mutate({ eventId: parsedEventId!, characterId, realmId, bossId });
      }

      if (targetRole && character) {
        assignToRoster.mutate({
          eventId: parsedEventId!,
          realmId,
          payload: { characterId, role: targetRole, bossId },
          character,
        });
      }
    },
    [
      parsedEventId,
      realmId,
      assignToRoster,
      removeFromRoster,
      allPlayersInView,
      aggregatedAssignments,
    ],
  );

  const handleToggle = useCallback(
    (characterId: number, bossId: number, targetRole: RoleType | null) => {
      const character = allPlayersInView.find((p) => p.id === characterId);

      if (targetRole && character?.inConcurrentEvent) {
        setPendingAssignment({ characterId, bossId, targetRole, characterName: character.name });
        return;
      }

      executeAssignment(characterId, bossId, targetRole);
    },
    [allPlayersInView, executeAssignment],
  );

  const handleAssignAll = useCallback(
    (characterId: number, role: RoleType | null) => {
      const character = allPlayersInView.find((p) => p.id === characterId);
      if (!character) return;

      if (role && character.inConcurrentEvent) {
        setPendingAssignment({
          characterId,
          bossId: null,
          targetRole: role,
          characterName: character.name,
          assignAll: true,
        });
        return;
      }

      bosses.forEach((boss) => {
        executeAssignment(characterId, boss.id, role);
      });
    },
    [allPlayersInView, bosses, executeAssignment],
  );

  if (eventLoading || isLoadingRosters || poolLoading || rosterLoading || !event) {
    return <EventRosterSkeleton />;
  }

  const containerStyle = {
    minHeight: 500,
    padding: '20px 0 20px 20px',
  };

  return (
    <>
      <ConfirmModal
        opened={!!pendingAssignment}
        onClose={() => setPendingAssignment(null)}
        onConfirm={() => {
          if (pendingAssignment) {
            if (pendingAssignment.assignAll) {
              handleAssignAll(pendingAssignment.characterId, pendingAssignment.targetRole);
            } else if (pendingAssignment.bossId !== null) {
              executeAssignment(
                pendingAssignment.characterId,
                pendingAssignment.bossId,
                pendingAssignment.targetRole,
              );
            }
          }
          setPendingAssignment(null);
        }}
        title="Joueur assigné dans un autre raid"
        alert={
          <Text size="sm">
            <Text span fw={700}>
              {pendingAssignment?.characterName}
            </Text>{' '}
            est déjà assigné à un autre raid sur la même tranche horaire.
          </Text>
        }
        message="Voulez-vous quand même l'assigner à ce raid ?"
        confirmLabel="Assigner quand même"
      />
      <ImportRosterModal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        pastRosters={pastRosters}
        isLoading={pastRostersLoading}
        isImporting={importRoster.isPending}
        onImport={(sourceEventId) => importRoster.mutate(sourceEventId)}
      />
      <GenerateCompositionModal
        opened={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        eventId={parsedEventId}
        realmId={realmId}
        difficulty={event?.raid_difficulty?.difficulty_rel?.name || difficultyKey}
        hasExistingAssignments={aggregatedAssignments.length > 0}
        bosses={orderedBosses.map((b) => ({ id: b.id, name: b.name }))}
      />
      {showBossNotes && !!parsedEventId && (
        <BossNotesDrawer
          opened={notesOpen}
          onClose={() => setNotesOpen(false)}
          eventId={parsedEventId}
          realmId={realmId}
          bosses={orderedBosses}
          assignments={aggregatedAssignments}
          canEdit={canEdit}
        />
      )}
      <Box w="100%" p="lg" data-breakout style={{ ...containerStyle }} px="xl">
        <Stack gap="lg" h="calc(100vh - 100px)">
          <EventRosterHeader
            title={event.title}
            startTime={event.startTime}
            canEdit={canEdit}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onImport={canEdit ? () => setImportModalOpen(true) : undefined}
            onGenerate={canEdit ? () => setGenerateModalOpen(true) : undefined}
            onOpenNotes={showBossNotes ? () => setNotesOpen(true) : undefined}
          />

          {showVacancies && (
            <RosterVacancyAlert
              vacancies={vacancies}
              bossNames={bossNames}
              onReplace={handleReplace}
              pendingKey={pendingVacancyKey}
            />
          )}

          <Box style={{ flex: 1 }}>
            {viewMode === 'MATRIX' && canEdit ? (
              <RosterMatrixTable
                bosses={orderedBosses}
                poolCharacters={allPlayersInView}
                assignments={aggregatedAssignments}
                onToggle={handleToggle}
                onAssignAll={handleAssignAll}
                isEditable={canEdit}
                guests={event.guests ?? []}
                guestAssignments={guestAssignments}
                onGuestToggle={handleGuestToggle}
                difficulty={difficultyKey}
                onMoveBoss={moveBoss}
              />
            ) : (
              <RosterSummaryView
                bosses={orderedBosses}
                players={allPlayersInView}
                assignments={aggregatedAssignments}
                currentUserId={user?.id}
                guests={event.guests ?? []}
                guestAssignments={guestAssignments}
                difficulty={difficultyKey}
              />
            )}
          </Box>
        </Stack>
      </Box>
    </>
  );
}
