import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Menu,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconClock,
  IconCopy,
  IconEdit,
  IconInfoCircle,
  IconQuestionMark,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useAuth, useRealmAccess } from 'contexts';
import {
  useAddGuest,
  useCharacters,
  useDeleteEvent,
  useEvent,
  useRemoveGuest,
  useUpsertSignup,
} from 'hooks/queries';
import { useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Character } from 'types/character.types';
import { Permission } from 'types/permissions';
import { normalizeClass } from 'utils';
import { Can } from 'utils/auth';

import type { RaidEvent, RaidSignup } from '../../../services/event.service';
import DuplicateEventModal from './DuplicateEventModal';
import styles from './EventModal.module.css';

type State = {
  signupStatus: string | null;
  guestModalOpened: boolean;
  duplicateModalOpened: boolean;
  guestName: string;
  guestRole: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED' | null;
  guestClass: string | null;
  localSelectedCharacterId: number | null;
};

const initialState: State = {
  signupStatus: null,
  guestModalOpened: false,
  duplicateModalOpened: false,
  guestName: '',
  guestRole: null,
  guestClass: null,
  localSelectedCharacterId: null,
};

type Action =
  | { type: 'SET_SIGNUP_STATUS'; payload: string | null }
  | { type: 'SET_GUEST_MODAL_OPENED'; payload: boolean }
  | { type: 'SET_DUPLICATE_MODAL_OPENED'; payload: boolean }
  | { type: 'SET_GUEST_NAME'; payload: string }
  | { type: 'SET_GUEST_ROLE'; payload: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED' | null }
  | { type: 'SET_GUEST_CLASS'; payload: string | null }
  | { type: 'SET_LOCAL_SELECTED_CHARACTER_ID'; payload: number | null }
  | { type: 'RESET_GUEST_FORM' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SIGNUP_STATUS':
      return { ...state, signupStatus: action.payload };
    case 'SET_GUEST_MODAL_OPENED':
      return { ...state, guestModalOpened: action.payload };
    case 'SET_DUPLICATE_MODAL_OPENED':
      return { ...state, duplicateModalOpened: action.payload };
    case 'SET_GUEST_NAME':
      return { ...state, guestName: action.payload };
    case 'SET_GUEST_ROLE':
      return { ...state, guestRole: action.payload };
    case 'SET_GUEST_CLASS':
      return { ...state, guestClass: action.payload };
    case 'SET_LOCAL_SELECTED_CHARACTER_ID':
      return { ...state, localSelectedCharacterId: action.payload };
    case 'RESET_GUEST_FORM':
      return {
        ...state,
        guestName: '',
        guestRole: null,
        guestClass: null,
        guestModalOpened: false,
      };
    default:
      return state;
  }
}

interface EventModalProps {
  event: RaidEvent;
  opened: boolean;
  onClose: () => void;
  realmId: number;
  onEdit?: () => void;
}

export default function EventModal({ event, opened, onClose, realmId, onEdit }: EventModalProps) {
  const { t } = useTranslation(['calendar', 'roster']);
  const { user } = useAuth();
  const { hasPermission } = useRealmAccess();
  const { data: characters = [] } = useCharacters(realmId) as { data: Character[] | undefined };
  const upsertSignup = useUpsertSignup();
  const addGuest = useAddGuest();
  const removeGuest = useRemoveGuest();
  const deleteEvent = useDeleteEvent();
  const navigate = useNavigate();
  const { data: liveEvent } = useEvent(event.id, realmId);
  const currentEvent = liveEvent ?? event;
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    signupStatus,
    guestModalOpened,
    duplicateModalOpened,
    guestName,
    guestRole,
    guestClass,
    localSelectedCharacterId,
  } = state;

  const myCharactersInRealm = useMemo(
    () =>
      characters?.filter((c) => {
        const characterUserId = String(c.userId);
        const currentUserId = String(user?.id);
        return characterUserId === currentUserId && c.realmId === realmId;
      }) || [],
    [characters, user?.id, realmId],
  );

  const currentSignupCharacter = myCharactersInRealm.find((c) =>
    currentEvent.signups?.some((s) => s.characterId === c.id),
  );

  useEffect(() => {
    if (opened && myCharactersInRealm.length > 0) {
      const defaultChar = currentSignupCharacter || myCharactersInRealm[0];
      dispatch({ type: 'SET_LOCAL_SELECTED_CHARACTER_ID', payload: defaultChar?.id || null });
    }
  }, [
    opened,
    myCharactersInRealm.length,
    currentSignupCharacter?.id,
    myCharactersInRealm,
    currentSignupCharacter,
  ]);

  const localSelectedCharacter = myCharactersInRealm.find((c) => c.id === localSelectedCharacterId);

  const mySignup = currentEvent.signups?.find((s) => {
    return myCharactersInRealm.some((c) => c.id === s.characterId);
  });

  const isMySignup = (signup: RaidSignup) => {
    const signupUserId = signup.character?.userId;
    return signupUserId && String(signupUserId) === String(user?.id);
  };

  console.log('[EventModal] Debug:', {
    userId: user?.id,
    realmId,
    characters: characters?.length,
    myCharactersInRealm: myCharactersInRealm.map((c) => c.name),
    localSelectedCharacter: localSelectedCharacter?.name,
  });

  const form = useForm({
    initialValues: {
      lateTime: mySignup?.lateTime || '',
      absenceReason: mySignup?.absenceReason || '',
    },
  });

  const handleSignup = async (status: 'PRESENT' | 'ABSENT' | 'TENTATIVE' | 'BENCH' | 'LATE') => {
    if (!localSelectedCharacter) {
      console.error('[EventModal] No character selected:', {
        userId: user?.id,
        realmId,
        availableCharacters: myCharactersInRealm.map((c) => c.name),
      });

      notifications.show({
        title: t('messages.error'),
        message: 'No character found for this realm',
        color: 'red',
      });
      return;
    }

    try {
      await upsertSignup.mutateAsync({
        eventId: event.id,
        realmId,
        payload: {
          characterId: localSelectedCharacter.id,
          status: status,
          lateTime: status === 'LATE' ? form.values.lateTime : undefined,
          absenceReason: status === 'ABSENT' ? form.values.absenceReason : undefined,
        },
      });

      notifications.show({
        title: t('messages.signupSuccess'),
        message: t(`signup.${status.toLowerCase()}`),
        color: 'green',
      });

      dispatch({ type: 'SET_SIGNUP_STATUS', payload: null });
      form.reset();
      onClose();
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      notifications.show({
        title: t('messages.error'),
        message: apiMessage === 'signup_locked' ? t('messages.signupLocked') : String(error),
        color: 'red',
      });
    }
  };

  const handleAdminStatusChange = async (
    characterId: number,
    status: 'PRESENT' | 'ABSENT' | 'TENTATIVE' | 'BENCH' | 'LATE',
  ) => {
    try {
      await upsertSignup.mutateAsync({
        eventId: event.id,
        realmId,
        payload: {
          characterId,
          status: status,
        },
      });
      notifications.show({
        title: t('messages.signupSuccess'),
        message: t(`signup.${status.toLowerCase()}`),
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: t('messages.error'),
        message: String(error),
        color: 'red',
      });
    }
  };

  const handleAddGuest = async () => {
    if (!guestName.trim() || !guestRole) return;
    try {
      await addGuest.mutateAsync({
        eventId: event.id,
        realmId,
        payload: { name: guestName.trim(), role: guestRole, class: guestClass ?? undefined },
      });
      dispatch({ type: 'RESET_GUEST_FORM' });
      notifications.show({ title: t('guests.added'), message: guestName.trim(), color: 'teal' });
    } catch (error) {
      notifications.show({ title: t('messages.error'), message: String(error), color: 'red' });
    }
  };

  const handleRemoveGuest = async (guestId: number) => {
    try {
      await removeGuest.mutateAsync({ eventId: event.id, guestId, realmId });
    } catch (error) {
      notifications.show({ title: t('messages.error'), message: String(error), color: 'red' });
    }
  };

  const { i18n } = useTranslation();

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: 'green',
      ABSENT: 'red',
      TENTATIVE: 'yellow',
      LATE: 'orange',
      BENCH: 'gray',
    };

    return (
      <Badge color={colors[status] || 'gray'} size="sm">
        {t(`signup.${status.toLowerCase()}`)}
      </Badge>
    );
  };

  type RoleResolvable = {
    role?: string | null;
    class?: string | null;
    spec?: string | null;
    specialization?: { role?: string | null; name?: string | null } | null;
  };

  const getCharacterRole = (c: RoleResolvable): 'TANK' | 'HEALER' | 'MELEE' | 'RANGED' => {
    if (c.role && ['TANK', 'HEALER', 'MELEE', 'RANGED'].includes(c.role.toUpperCase())) {
      return c.role.toUpperCase() as 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
    }

    // Rôle de la spé, servi par l'API avec le personnage (SIMS-212).
    const specRole = c.specialization?.role?.toUpperCase();
    if (
      specRole === 'TANK' ||
      specRole === 'HEALER' ||
      specRole === 'MELEE' ||
      specRole === 'RANGED'
    ) {
      return specRole;
    }

    const className = (c.class || '').toLowerCase().replace(/\s+/g, '_');

    if (
      ['warrior', 'rogue', 'death_knight', 'demon_hunter', 'paladin', 'monk', 'hunter'].includes(
        className,
      )
    ) {
      if (
        ['warrior', 'rogue', 'death_knight', 'demon_hunter', 'paladin', 'monk'].includes(className)
      ) {
        return 'MELEE';
      }
    }

    return 'RANGED';
  };

  const usersWithSignup = new Set<string>();
  currentEvent.signups?.forEach((signup) => {
    const userId = signup.character?.userId;
    if (userId) {
      usersWithSignup.add(userId);
    }
  });

  const missingPlayers = (() => {
    const eligibleCharacters: Character[] =
      characters?.filter((character) => {
        if (character.realmId !== realmId) return false;

        const userId = character.userId ? String(character.userId) : null;
        if (userId && usersWithSignup.has(userId)) {
          return false;
        }

        if (!userId) {
          const hasSignedUp = currentEvent.signups?.some(
            (signup) => signup.characterId === character.id,
          );
          return !hasSignedUp;
        }

        return true;
      }) || [];

    const byUser = new Map<string, (typeof eligibleCharacters)[0]>();
    for (const character of eligibleCharacters) {
      const userId = character.userId ? String(character.userId) : null;
      if (!userId || userId === 'null' || userId === 'undefined') {
        byUser.set(`no-user-${character.id}`, character);
      } else if (!byUser.has(userId)) {
        byUser.set(userId, character);
      }
    }
    return Array.from(byUser.values());
  })();

  type PlayerEntry = {
    id: string;
    characterId: number;
    name: string;
    class?: string;
    specName?: string;
    status: 'PRESENT' | 'ABSENT' | 'TENTATIVE' | 'BENCH' | 'LATE' | null;
    isMe: boolean;
    absenceReason?: string;
  };

  const ORDERED_ROLES = ['TANK', 'HEALER', 'MELEE', 'RANGED'] as const;
  const roleColors: Record<string, string> = {
    TANK: 'blue',
    HEALER: 'green',
    MELEE: 'red',
    RANGED: 'cyan',
  };
  const roleKeys: Record<string, string> = {
    TANK: 'tanks',
    HEALER: 'healers',
    MELEE: 'melee',
    RANGED: 'ranged',
  };
  const statusOrder: Record<string, number> = {
    PRESENT: 0,
    LATE: 1,
    TENTATIVE: 2,
    BENCH: 3,
    ABSENT: 4,
  };

  const allByRole = (() => {
    const grouped: Record<'TANK' | 'HEALER' | 'MELEE' | 'RANGED', PlayerEntry[]> = {
      TANK: [],
      HEALER: [],
      MELEE: [],
      RANGED: [],
    };

    const seenUsers = new Set<string>();
    for (const signup of currentEvent.signups || []) {
      const userId = signup.character?.userId
        ? String(signup.character.userId)
        : `char-${signup.characterId}`;
      if (seenUsers.has(userId)) continue;
      seenUsers.add(userId);

      let role = signup.role || '';
      if (!role || role === 'DPS' || !['TANK', 'HEALER', 'MELEE', 'RANGED'].includes(role)) {
        role = signup.character ? getCharacterRole(signup.character) : 'RANGED';
      }
      grouped[role as keyof typeof grouped].push({
        id: `signup-${signup.id}`,
        characterId: signup.characterId,
        name: signup.character?.name || '',
        class: signup.character?.class,
        specName: signup.character?.spec,
        status: signup.status,
        isMe: !!isMySignup(signup),
        absenceReason: signup.absenceReason || undefined,
      });
    }

    for (const char of missingPlayers) {
      const role = getCharacterRole(char);
      grouped[role].push({
        id: `char-${char.id}`,
        characterId: char.id,
        name: char.name,
        class: char.class,
        specName: char.specialization?.name,
        status: null,
        isMe: false,
      });
    }

    for (const players of Object.values(grouped)) {
      players.sort((a, b) => {
        const aOrder = a.status !== null ? (statusOrder[a.status] ?? 3) : 5;
        const bOrder = b.status !== null ? (statusOrder[b.status] ?? 3) : 5;
        return aOrder - bOrder;
      });
    }
    return grouped;
  })();

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text>{event.title}</Text>
            <Group gap="xs">
              <Can I={Permission.MANAGE_SIGNUPS}>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconUsers size={16} />}
                  onClick={() => {
                    navigate(`event/${event.id}/roster`);
                    onClose();
                  }}
                >
                  {t('actions.manageRoster', { defaultValue: 'Roster' })}
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="teal"
                  leftSection={<IconUserPlus size={16} />}
                  onClick={() => dispatch({ type: 'SET_GUEST_MODAL_OPENED', payload: true })}
                >
                  {t('guests.buttonLabel', { count: currentEvent.guests?.length ?? 0 })}
                </Button>
              </Can>
              <Can I={Permission.EDIT_EVENT}>
                {onEdit && (
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconEdit size={16} />}
                    onClick={() => {
                      onEdit();
                      onClose();
                    }}
                  >
                    {t('actions.edit')}
                  </Button>
                )}
              </Can>
              <Can I={Permission.MANAGE_RAID}>
                <Button
                  size="xs"
                  variant="subtle"
                  color="violet"
                  leftSection={<IconCopy size={16} />}
                  onClick={() => dispatch({ type: 'SET_DUPLICATE_MODAL_OPENED', payload: true })}
                >
                  {t('actions.duplicate')}
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  loading={deleteEvent.isPending}
                  onClick={() => {
                    if (window.confirm(t('messages.deleteConfirm'))) {
                      deleteEvent.mutate(
                        { id: event.id, realmId },
                        {
                          onSuccess: () => {
                            notifications.show({
                              title: t('messages.eventDeleted'),
                              message: event.title,
                              color: 'red',
                            });
                            onClose();
                          },
                        },
                      );
                    }
                  }}
                >
                  {t('actions.delete')}
                </Button>
              </Can>
            </Group>
          </Group>
        }
        size="100%"
      >
        <Stack gap="md">
          <Box>
            {event.description && (
              <Text size="sm" c="dimmed" mb="md">
                {event.description}
              </Text>
            )}

            <Group gap="xl">
              <Group gap="xs">
                <IconClock size={16} />
                <Text size="sm">{formatDateTime(event.startTime)}</Text>
              </Group>

              {event.raid_difficulty && (
                <Text size="sm" fw={600}>
                  {event.raid_difficulty.raid.name} - {event.raid_difficulty.difficulty_rel.name}
                </Text>
              )}
            </Group>
          </Box>

          <Divider />

          <Box>
            <Title order={4} mb="md">
              {t('signup.title')}
            </Title>

            {myCharactersInRealm.length > 1 && (
              <Group mb="md">
                <Text size="sm" fw={500}>
                  {t('signup.signupAs')}:
                </Text>
                <Select
                  value={localSelectedCharacterId?.toString()}
                  onChange={(value) =>
                    dispatch({
                      type: 'SET_LOCAL_SELECTED_CHARACTER_ID',
                      payload: value ? parseInt(value) : null,
                    })
                  }
                  data={myCharactersInRealm.map((char) => ({
                    value: char.id.toString(),
                    label: `${char.name} (${
                      char.specialization?.name ||
                      t(`roster:classes.${char.class.toLowerCase().replace(' ', '_')}`, {
                        defaultValue: char.class,
                      })
                    })`,
                  }))}
                  w={200}
                  size="sm"
                  allowDeselect={false}
                />
              </Group>
            )}

            <Can I={Permission.SIGNUP_EVENT}>
              <Stack mt="md" gap="xs">
                <Text size="sm" fw={600} c="dimmed" tt="uppercase">
                  {t('signup.yourStatus')}
                </Text>

                <Group gap="xs" grow>
                  <Card
                    padding="xs"
                    radius="md"
                    withBorder
                    className={`${styles.statusCard} ${styles.statusCardGreen} ${
                      (signupStatus || mySignup?.status) === 'PRESENT'
                        ? styles.statusCardActiveGreen
                        : ''
                    }`}
                    onClick={() => handleSignup('PRESENT')}
                  >
                    <Group gap={6} wrap="nowrap">
                      <IconCheck size={18} color="var(--mantine-color-green-6)" />
                      <Text size="xs" fw={500} c="dimmed">
                        {t('signup.present')}
                      </Text>
                    </Group>
                  </Card>

                  <Card
                    padding="xs"
                    radius="md"
                    withBorder
                    className={`${styles.statusCard} ${styles.statusCardRed} ${
                      (signupStatus || mySignup?.status) === 'ABSENT'
                        ? styles.statusCardActiveRed
                        : ''
                    }`}
                    onClick={() => dispatch({ type: 'SET_SIGNUP_STATUS', payload: 'ABSENT' })}
                  >
                    <Group gap={6} wrap="nowrap">
                      <IconX size={18} color="var(--mantine-color-red-6)" />
                      <Text size="xs" fw={500} c="dimmed">
                        {t('signup.absent')}
                      </Text>
                    </Group>
                  </Card>

                  <Card
                    padding="xs"
                    radius="md"
                    withBorder
                    className={`${styles.statusCard} ${styles.statusCardOrange} ${
                      (signupStatus || mySignup?.status) === 'LATE'
                        ? styles.statusCardActiveOrange
                        : ''
                    }`}
                    onClick={() => dispatch({ type: 'SET_SIGNUP_STATUS', payload: 'LATE' })}
                  >
                    <Group gap={6} wrap="nowrap">
                      <IconClock size={18} color="var(--mantine-color-orange-6)" />
                      <Text size="xs" fw={500} c="dimmed">
                        {t('signup.late')}
                      </Text>
                    </Group>
                  </Card>

                  <Card
                    padding="xs"
                    radius="md"
                    withBorder
                    className={`${styles.statusCard} ${styles.statusCardYellow} ${
                      (signupStatus || mySignup?.status) === 'TENTATIVE'
                        ? styles.statusCardActiveYellow
                        : ''
                    }`}
                    onClick={() => handleSignup('TENTATIVE')}
                  >
                    <Group gap={6} wrap="nowrap">
                      <IconQuestionMark size={18} color="var(--mantine-color-yellow-6)" />
                      <Text size="xs" fw={500} c="dimmed">
                        {t('signup.tentative')}
                      </Text>
                    </Group>
                  </Card>

                  <Card
                    padding="xs"
                    radius="md"
                    withBorder
                    className={`${styles.statusCard} ${styles.statusCardGray} ${
                      (signupStatus || mySignup?.status) === 'BENCH'
                        ? styles.statusCardActiveGray
                        : ''
                    }`}
                    onClick={() => handleSignup('BENCH')}
                  >
                    <Group gap={6} wrap="nowrap">
                      <IconUserMinus size={18} color="var(--mantine-color-gray-6)" />
                      <Text size="xs" fw={500} c="dimmed">
                        {t('signup.bench')}
                      </Text>
                    </Group>
                  </Card>
                </Group>
              </Stack>

              {signupStatus === 'LATE' && (
                <Box mt="md">
                  <Select
                    label={t('signup.lateTime')}
                    placeholder="Select arrival time"
                    data={[
                      { value: '19:00', label: '19:00' },
                      { value: '19:30', label: '19:30' },
                      { value: '20:00', label: '20:00' },
                      { value: '20:30', label: '20:30' },
                      { value: '21:00', label: '21:00' },
                      { value: '21:30', label: '21:30' },
                      { value: '22:00', label: '22:00' },
                      { value: '22:30', label: '22:30' },
                      { value: '23:00', label: '23:00' },
                      { value: '23:30', label: '23:30' },
                    ]}
                    {...form.getInputProps('lateTime')}
                  />
                  <Group mt="sm">
                    <Button
                      size="sm"
                      onClick={() => handleSignup('LATE')}
                      loading={upsertSignup.isPending}
                    >
                      {t('actions.confirm')}
                    </Button>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={() => dispatch({ type: 'SET_SIGNUP_STATUS', payload: null })}
                    >
                      {t('actions.cancel')}
                    </Button>
                  </Group>
                </Box>
              )}

              {signupStatus === 'ABSENT' && (
                <Box mt="md">
                  <Textarea
                    label={t('signup.absenceReason')}
                    placeholder="..."
                    {...form.getInputProps('absenceReason')}
                  />
                  <Group mt="sm">
                    <Button
                      size="sm"
                      onClick={() => handleSignup('ABSENT')}
                      loading={upsertSignup.isPending}
                    >
                      {t('actions.confirm')}
                    </Button>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={() => dispatch({ type: 'SET_SIGNUP_STATUS', payload: null })}
                    >
                      {t('actions.cancel')}
                    </Button>
                  </Group>
                </Box>
              )}
            </Can>
          </Box>

          <Divider />

          {/* Roster unifié — présents, absents et sans statut par rôle */}
          <Box>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs" verticalSpacing="xs">
              {ORDERED_ROLES.map((role) => {
                const players = allByRole[role];
                const activeCount = players.filter(
                  (p) => p.status !== null && p.status !== 'ABSENT',
                ).length;

                return (
                  <Card
                    key={role}
                    padding="xs"
                    radius="md"
                    withBorder
                    style={{
                      height: '100%',
                      backgroundColor:
                        players.length === 0 ? 'var(--mantine-color-gray-9)' : undefined,
                      opacity: players.length === 0 ? 0.6 : 1,
                    }}
                  >
                    <Group
                      justify="space-between"
                      mb="xs"
                      style={{
                        borderBottom: '1px solid var(--mantine-color-dark-4)',
                        paddingBottom: 4,
                      }}
                    >
                      <Text fw={700} size="sm" tt="uppercase" c={roleColors[role]}>
                        {t(`roster.${roleKeys[role]}`, { defaultValue: role })}
                      </Text>
                      <Badge size="sm" variant="filled" color={roleColors[role]}>
                        {activeCount} / {players.length}
                      </Badge>
                    </Group>

                    {players.length > 0 ? (
                      <Stack gap={4} style={{ overflowY: 'auto', maxHeight: '400px' }}>
                        {players.map((player) => (
                          <Group key={player.id} justify="space-between" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                              <img
                                src={`/src/character/spec/${
                                  player.specName?.toLowerCase().replace(/ /g, '_') || ''
                                }_${normalizeClass(player.class)}.webp`}
                                alt={player.specName}
                                width={20}
                                height={20}
                                style={{ borderRadius: '50%' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    `/src/character/class/${normalizeClass(player.class)}-icon.svg`;
                                }}
                              />
                              <Text
                                size="sm"
                                fw={player.isMe ? 700 : 400}
                                truncate
                                c={
                                  player.isMe
                                    ? 'brand'
                                    : player.status === null
                                      ? 'dimmed'
                                      : undefined
                                }
                              >
                                {player.name}
                                {player.isMe ? ' ★' : ''}
                              </Text>
                              {player.absenceReason && hasPermission(Permission.MANAGE_SIGNUPS) && (
                                <Tooltip label={player.absenceReason} withArrow position="top">
                                  <IconInfoCircle
                                    size={14}
                                    style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }}
                                  />
                                </Tooltip>
                              )}
                            </Group>
                            {hasPermission(Permission.MANAGE_SIGNUPS) ? (
                              <Menu shadow="md" width={160} position="bottom-end" withinPortal>
                                <Menu.Target>
                                  <Box style={{ cursor: 'pointer' }}>
                                    {player.status !== null ? (
                                      getStatusBadge(player.status)
                                    ) : (
                                      <Badge size="xs" color="gray" variant="outline">
                                        —
                                      </Badge>
                                    )}
                                  </Box>
                                </Menu.Target>
                                <Menu.Dropdown>
                                  <Menu.Label>{t('signup.yourStatus')}</Menu.Label>
                                  <Menu.Item
                                    leftSection={
                                      <IconCheck size={14} color="var(--mantine-color-green-6)" />
                                    }
                                    onClick={() =>
                                      handleAdminStatusChange(player.characterId, 'PRESENT')
                                    }
                                    fw={player.status === 'PRESENT' ? 700 : 400}
                                  >
                                    {t('signup.present')}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={
                                      <IconQuestionMark
                                        size={14}
                                        color="var(--mantine-color-yellow-6)"
                                      />
                                    }
                                    onClick={() =>
                                      handleAdminStatusChange(player.characterId, 'TENTATIVE')
                                    }
                                    fw={player.status === 'TENTATIVE' ? 700 : 400}
                                  >
                                    {t('signup.tentative')}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={
                                      <IconUserMinus
                                        size={14}
                                        color="var(--mantine-color-gray-6)"
                                      />
                                    }
                                    onClick={() =>
                                      handleAdminStatusChange(player.characterId, 'BENCH')
                                    }
                                    fw={player.status === 'BENCH' ? 700 : 400}
                                  >
                                    {t('signup.bench')}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={
                                      <IconX size={14} color="var(--mantine-color-red-6)" />
                                    }
                                    onClick={() =>
                                      handleAdminStatusChange(player.characterId, 'ABSENT')
                                    }
                                    fw={player.status === 'ABSENT' ? 700 : 400}
                                  >
                                    {t('signup.absent')}
                                  </Menu.Item>
                                </Menu.Dropdown>
                              </Menu>
                            ) : (
                              <>
                                {player.status !== null ? (
                                  getStatusBadge(player.status)
                                ) : (
                                  <Badge size="xs" color="gray" variant="outline">
                                    —
                                  </Badge>
                                )}
                              </>
                            )}
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="xs" c="dimmed" fs="italic">
                        {t('roster.empty', { defaultValue: '-' })}
                      </Text>
                    )}
                  </Card>
                );
              })}
            </SimpleGrid>
          </Box>
          <Can I={Permission.MANAGE_SIGNUPS}>
            <Divider />
            <Box>
              <Title order={4} mb="md">
                {t('guests.sectionTitle', { count: currentEvent.guests?.length ?? 0 })}
              </Title>

              <Modal
                opened={guestModalOpened}
                onClose={() => {
                  dispatch({ type: 'RESET_GUEST_FORM' });
                }}
                title={t('guests.modal.title')}
                size="sm"
                centered
              >
                <Stack gap="md">
                  <TextInput
                    label={t('guests.modal.nameLabel')}
                    placeholder={t('guests.modal.namePlaceholder')}
                    value={guestName}
                    onChange={(e) =>
                      dispatch({ type: 'SET_GUEST_NAME', payload: e.currentTarget.value })
                    }
                    data-autofocus
                  />
                  <Select
                    label={t('guests.modal.roleLabel')}
                    placeholder={t('guests.modal.rolePlaceholder')}
                    value={guestRole}
                    onChange={(v) =>
                      dispatch({
                        type: 'SET_GUEST_ROLE',
                        payload: v as 'TANK' | 'HEALER' | 'MELEE' | 'RANGED' | null,
                      })
                    }
                    data={[
                      { value: 'TANK', label: '🛡️ Tank' },
                      { value: 'HEALER', label: '➕ Heal' },
                      { value: 'MELEE', label: '⚔️ Melee' },
                      { value: 'RANGED', label: '🏹 Ranged' },
                    ]}
                  />
                  <Select
                    label={t('guests.modal.classLabel', { defaultValue: 'Classe' })}
                    placeholder={t('guests.modal.classPlaceholder', {
                      defaultValue: 'Choisir une classe (optionnel)',
                    })}
                    value={guestClass}
                    onChange={(v) => dispatch({ type: 'SET_GUEST_CLASS', payload: v })}
                    clearable
                    data={[
                      { value: 'warrior', label: 'Guerrier' },
                      { value: 'paladin', label: 'Paladin' },
                      { value: 'hunter', label: 'Chasseur' },
                      { value: 'rogue', label: 'Voleur' },
                      { value: 'priest', label: 'Prêtre' },
                      { value: 'shaman', label: 'Chaman' },
                      { value: 'mage', label: 'Mage' },
                      { value: 'warlock', label: 'Démoniste' },
                      { value: 'monk', label: 'Moine' },
                      { value: 'druid', label: 'Druide' },
                      { value: 'death_knight', label: 'Chevalier de la mort' },
                      { value: 'demon_hunter', label: 'Chasseur de démons' },
                      { value: 'evoker', label: 'Évocateur' },
                    ]}
                  />
                  <Group justify="flex-end">
                    <Button
                      variant="subtle"
                      onClick={() => {
                        dispatch({ type: 'RESET_GUEST_FORM' });
                      }}
                    >
                      {t('actions.cancel')}
                    </Button>
                    <Button
                      color="teal"
                      onClick={handleAddGuest}
                      loading={addGuest.isPending}
                      disabled={!guestName.trim() || !guestRole}
                    >
                      {t('guests.modal.add')}
                    </Button>
                  </Group>
                </Stack>
              </Modal>

              {currentEvent.guests && currentEvent.guests.length > 0 ? (
                <Card withBorder padding="sm">
                  <Stack gap={6}>
                    {currentEvent.guests.map((guest) => (
                      <Group key={guest.id} justify="space-between">
                        <Group gap="xs">
                          {guest.class && (
                            <img
                              src={`/src/character/class/${normalizeClass(guest.class)}-icon.svg`}
                              alt={guest.class}
                              style={{ width: 16, height: 16 }}
                            />
                          )}
                          <Badge size="sm" variant="light" color="teal">
                            {guest.role}
                          </Badge>
                          <Text size="sm" fw={500}>
                            {guest.name}
                          </Text>
                        </Group>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => handleRemoveGuest(guest.id)}
                          loading={removeGuest.isPending}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">
                  {t('guests.empty')}
                </Text>
              )}
            </Box>
          </Can>
        </Stack>
      </Modal>

      <DuplicateEventModal
        opened={duplicateModalOpened}
        onClose={() => dispatch({ type: 'SET_DUPLICATE_MODAL_OPENED', payload: false })}
        event={currentEvent}
        realmId={realmId}
      />
    </>
  );
}
