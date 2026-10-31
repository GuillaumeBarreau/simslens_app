import { Alert, Box, Button, Container, Group, Loader, Modal, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from 'components/design-system/atoms';
import { TableSkeleton } from 'components/design-system/molecules/Skeleton';
import { RealmAdminDrawer } from 'components/domain/admin/RealmAdminDrawer';
import { RosterDrawer } from 'components/domain/roster/RosterDrawer';
import { useDifficulty, useRealmAccess } from 'contexts';
import { useAuth } from 'contexts/AuthContext';
import {
  useClearRealmUpgrades,
  useDeleteCharacter,
  useFetchGuildRoster,
  usePendingCharacters,
  useRefreshRoster,
  useRosterWishlistCompletion,
  useTrackingRoster,
  useUpdateCharacter,
  useUserRealm,
} from 'hooks/queries';
import React, { useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character } from 'types/character.types';

import { RosterFilters, RosterStatusSelector } from './components/RosterFilters';
import { RosterHeader } from './components/RosterHeader';
import { RosterSummary } from './components/RosterSummary';
import { RosterTable } from './components/RosterTable';
import classes from './RosterPage.module.css';
import { initialState, reducer } from './RosterPage.reducers';
import {
  countCompleteness,
  filterRoster,
  hasActiveFilters,
  listForStatus,
  sortRoster,
  splitRoster,
  summarizeComposition,
  type WishlistCompletion,
} from './rosterView';

const EMPTY: Character[] = [];
const EMPTY_COMPLETION: WishlistCompletion = {};

const RosterPage: React.FC = () => {
  const { t } = useTranslation(['roster', 'common']);
  const queryClient = useQueryClient();
  const { difficulty } = useDifficulty();
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    drawerOpened,
    editingCharacter,
    adminDrawerOpened,
    sortKey,
    sortDir,
    searchQuery,
    classFilter,
    roleFilter,
    completenessFilter,
    statusFilter,
    importDrawerOpened,
    clearModalOpened,
    deleteModalOpened,
    characterToDelete,
  } = state;

  const { user } = useAuth();
  const { canEditAll, canEditSelf } = useRealmAccess();

  const {
    data: realmData,
    error: realmError,
    isLoading: realmLoading,
  } = useUserRealm(user?.id ? String(user.id) : null);
  const realmId = realmData?.id;

  const {
    data: activeCharacters = EMPTY,
    isLoading: isActiveLoading,
    error: activeError,
  } = useTrackingRoster(difficulty, realmId);
  const {
    data: pendingCharacters = EMPTY,
    isLoading: isPendingLoading,
    error: pendingError,
  } = usePendingCharacters(difficulty, realmId);
  const { data: wishlistCompletion = EMPTY_COMPLETION } = useRosterWishlistCompletion(
    realmData?.region,
    realmData?.guildName,
  );

  const fetchGuildRoster = useFetchGuildRoster();
  const refreshRoster = useRefreshRoster();
  const clearUpgrades = useClearRealmUpgrades();
  const deleteCharacterMutation = useDeleteCharacter();
  const approveCharacterMutation = useUpdateCharacter();

  const lists = useMemo(
    () => splitRoster(activeCharacters, pendingCharacters),
    [activeCharacters, pendingCharacters],
  );
  const composition = useMemo(() => summarizeComposition(lists.active), [lists.active]);
  const memberCompleteness = useMemo(
    () => countCompleteness(lists.active, wishlistCompletion),
    [lists.active, wishlistCompletion],
  );
  const statusList = listForStatus(lists, statusFilter);
  const listCompleteness = useMemo(
    () => countCompleteness(statusList, wishlistCompletion),
    [statusList, wishlistCompletion],
  );

  const isFiltered = hasActiveFilters({
    search: searchQuery,
    classFilter,
    role: roleFilter,
    completeness: completenessFilter,
  });

  const visibleRoster = useMemo(
    () =>
      sortRoster(
        filterRoster(
          lists,
          {
            status: statusFilter,
            search: searchQuery,
            classFilter,
            role: roleFilter,
            completeness: completenessFilter,
          },
          wishlistCompletion,
        ),
        sortKey,
        sortDir,
        wishlistCompletion,
      ),
    [
      lists,
      statusFilter,
      searchQuery,
      classFilter,
      roleFilter,
      completenessFilter,
      wishlistCompletion,
      sortKey,
      sortDir,
    ],
  );

  const closeDrawer = () => {
    dispatch({ type: 'SET_DRAWER_OPENED', payload: false });
    dispatch({ type: 'SET_EDITING_CHARACTER', payload: null });
  };

  const openDrawer = (character: Character | null) => {
    dispatch({ type: 'SET_EDITING_CHARACTER', payload: character });
    dispatch({ type: 'SET_DRAWER_OPENED', payload: true });
  };

  const askDelete = (character: Character) => {
    dispatch({ type: 'SET_CHARACTER_TO_DELETE', payload: character });
    dispatch({ type: 'SET_DELETE_MODAL_OPENED', payload: true });
  };

  const closeDeleteModal = () => {
    dispatch({ type: 'SET_DELETE_MODAL_OPENED', payload: false });
    dispatch({ type: 'SET_CHARACTER_TO_DELETE', payload: null });
  };

  const handleImport = () => {
    if (!realmData?.server || !realmData?.guildName) return;
    fetchGuildRoster.mutate(
      {
        realm: realmData.server,
        guild: realmData.guildName,
        region: realmData.region || 'eu',
        realmId: realmData.id,
      },
      {
        onSuccess: () => dispatch({ type: 'SET_IMPORT_DRAWER_OPENED', payload: true }),
        onError: (error: unknown) => console.error('Failed to fetch roster:', error),
      },
    );
  };

  const handleImportSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ['characters'] });
    if (!realmId) return;
    const notificationId = notifications.show({
      loading: true,
      title: t('notifications.updating_data'),
      message: t('notifications.fetching_info'),
      autoClose: false,
      withCloseButton: false,
    });
    refreshRoster.mutate(realmId, {
      onSuccess: () =>
        notifications.update({
          id: notificationId,
          color: 'teal',
          title: t('notifications.success_title'),
          message: t('notifications.data_updated'),
          icon: <IconCheck size={16} />,
          loading: false,
          autoClose: 5000,
        }),
      onError: () =>
        notifications.update({
          id: notificationId,
          color: 'red',
          title: t('notifications.error_title'),
          message: t('notifications.update_error'),
          icon: <IconX size={16} />,
          loading: false,
          autoClose: 10_000,
        }),
    });
  };

  const confirmClearUpgrades = () => {
    if (!realmId) return;
    dispatch({ type: 'SET_CLEAR_MODAL_OPENED', payload: false });
    clearUpgrades.mutate(realmId, {
      onSuccess: () =>
        notifications.show({
          position: 'bottom-center',
          title: t('notifications.success_title'),
          message: t('notifications.upgrades_cleared'),
          color: 'green',
        }),
      onError: (err) => {
        console.error('Error clearing upgrades:', err);
        notifications.show({
          position: 'bottom-center',
          title: t('notifications.error_title'),
          message: t('notifications.upgrades_clear_error'),
          color: 'red',
        });
      },
    });
  };

  const confirmDeleteCharacter = () => {
    if (!characterToDelete) return;
    deleteCharacterMutation.mutate(
      { id: characterToDelete.id, realmId },
      {
        onSuccess: () => {
          notifications.show({
            title: t('notifications.success_title'),
            message: t('drawer.notifications.remove_success', { name: characterToDelete.name }),
            color: 'green',
          });
          closeDeleteModal();
        },
        onError: () => {
          notifications.show({
            title: t('notifications.error_title'),
            message: t('notifications.archive_error'),
            color: 'red',
          });
          closeDeleteModal();
        },
      },
    );
  };

  const handleApprove = (character: Character) => {
    approveCharacterMutation.mutate(
      { id: character.id, payload: { status: 'approved' } },
      {
        onSuccess: () =>
          notifications.show({
            title: t('notifications.success_title'),
            message: t('drawer.notifications.update_success', { name: character.name }),
            color: 'green',
          }),
        onError: () =>
          notifications.show({
            title: t('notifications.error_title'),
            message: t('drawer.notifications.update_error'),
            color: 'red',
          }),
      },
    );
  };

  if (realmLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} h="50vh">
        <Loader size="xl" />
      </Box>
    );
  }

  const queryError = activeError || pendingError;
  if (queryError) {
    return (
      <Box p="md">
        <Alert color="red" title={t('notifications.error_title')}>
          {queryError.message ?? 'Loading error'}
        </Alert>
      </Box>
    );
  }

  if (realmError) {
    return <Alert color="red">{t('notifications.loading_realm_error')}</Alert>;
  }

  const isRejecting = characterToDelete?.status === 'pending';

  return (
    <Container my="xl" size="xl" className={classes.page}>
      <Stack gap="lg">
        <RosterHeader
          realmData={realmData}
          memberCount={lists.active.length}
          pendingCount={lists.pending.length}
          guestCount={canEditAll ? lists.guests.length : null}
          isFetchingRoster={fetchGuildRoster.isPending}
          isClearing={clearUpgrades.isPending}
          importDrawerOpened={importDrawerOpened}
          rosterData={fetchGuildRoster.data ?? []}
          canManageAdmins={canEditAll}
          onAdd={() => openDrawer(null)}
          onImport={handleImport}
          onImportDrawerClose={() => dispatch({ type: 'SET_IMPORT_DRAWER_OPENED', payload: false })}
          onImportSuccess={handleImportSuccess}
          onManageAdmins={() => dispatch({ type: 'SET_ADMIN_DRAWER_OPENED', payload: true })}
          onClearUpgrades={() => dispatch({ type: 'SET_CLEAR_MODAL_OPENED', payload: true })}
        />

        <RosterSummary
          composition={composition}
          completeness={memberCompleteness}
          pending={lists.pending}
          canApprove={canEditAll}
          guildRealm={realmData?.server}
          roleFilter={roleFilter}
          classFilter={classFilter}
          completenessFilter={completenessFilter}
          onRole={(role) => {
            dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' });
            dispatch({ type: 'SET_ROLE_FILTER', payload: role });
          }}
          onClass={(className) => {
            dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' });
            dispatch({ type: 'SET_CLASS_FILTER', payload: className });
          }}
          onCompleteness={(filter) => {
            dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' });
            dispatch({ type: 'SET_COMPLETENESS_FILTER', payload: filter });
          }}
          onApprove={handleApprove}
          onReject={askDelete}
          onShowPending={() => dispatch({ type: 'SET_STATUS_FILTER', payload: 'pending' })}
        />

        <RosterStatusSelector
          status={statusFilter}
          counts={{
            all: lists.active.length,
            pending: lists.pending.length,
            guests: lists.guests.length,
          }}
          canViewGuests={canEditAll}
          onChange={(status) => dispatch({ type: 'SET_STATUS_FILTER', payload: status })}
        />

        <RosterFilters
          search={searchQuery}
          classFilter={classFilter}
          roleFilter={roleFilter}
          completenessFilter={completenessFilter}
          completenessCounts={listCompleteness}
          visibleCount={visibleRoster.length}
          totalCount={statusList.length}
          hasFilters={isFiltered}
          onSearch={(value) => dispatch({ type: 'SET_SEARCH_QUERY', payload: value })}
          onClass={(value) => dispatch({ type: 'SET_CLASS_FILTER', payload: value })}
          onRole={(value) => dispatch({ type: 'SET_ROLE_FILTER', payload: value })}
          onCompleteness={(value) => dispatch({ type: 'SET_COMPLETENESS_FILTER', payload: value })}
          onReset={() => dispatch({ type: 'RESET_FILTERS' })}
        />

        {isActiveLoading || isPendingLoading ? (
          <TableSkeleton columns={4} rows={10} />
        ) : (
          <RosterTable
            data={visibleRoster}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={(key) => dispatch({ type: 'SORT_BY', payload: key })}
            canEditAll={canEditAll}
            canEditSelf={canEditSelf}
            currentUserId={user?.id}
            onEdit={openDrawer}
            onDelete={askDelete}
            onApprove={handleApprove}
            statusFilter={statusFilter}
            isFiltered={isFiltered}
            realmId={realmId}
            guildRealm={realmData?.server}
            wishlistCompletion={wishlistCompletion}
          />
        )}
      </Stack>

      <RosterDrawer
        opened={drawerOpened}
        onClose={closeDrawer}
        realmId={realmId}
        editingCharacter={editingCharacter}
        onCharacterAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['characters'] });
          closeDrawer();
        }}
        onCharacterRemoved={() => {
          queryClient.invalidateQueries({ queryKey: ['characters'] });
        }}
        onCharacterUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['characters'] });
          closeDrawer();
        }}
      />

      <RealmAdminDrawer
        opened={adminDrawerOpened}
        onClose={() => dispatch({ type: 'SET_ADMIN_DRAWER_OPENED', payload: false })}
        realmId={realmId || 0}
      />

      <Modal
        opened={clearModalOpened}
        onClose={() => dispatch({ type: 'SET_CLEAR_MODAL_OPENED', payload: false })}
        title={t('page.clear_modal.title')}
        centered
      >
        <Stack gap="sm">
          <Text size="sm">{t('page.clear_modal.body', { guild: realmData?.guildName ?? '' })}</Text>
          <Text size="sm" c="dimmed">
            {t('page.clear_modal.irreversible')}
          </Text>
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => dispatch({ type: 'SET_CLEAR_MODAL_OPENED', payload: false })}
          >
            {t('common:cancel')}
          </Button>
          <Button color="red" loading={clearUpgrades.isPending} onClick={confirmClearUpgrades}>
            {t('page.clear_modal.confirm')}
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title={
          isRejecting
            ? t('page.delete_modal.reject_title', { name: characterToDelete?.name })
            : t('page.delete_modal.title', { name: characterToDelete?.name })
        }
        centered
      >
        <Text size="sm">
          {isRejecting ? t('page.delete_modal.reject_body') : t('page.delete_modal.body')}
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDeleteModal}>
            {t('common:cancel')}
          </Button>
          <Button
            color="red"
            loading={deleteCharacterMutation.isPending}
            onClick={confirmDeleteCharacter}
          >
            {isRejecting ? t('table.reject') : t('page.table.remove')}
          </Button>
        </Group>
      </Modal>
    </Container>
  );
};

export default RosterPage;
