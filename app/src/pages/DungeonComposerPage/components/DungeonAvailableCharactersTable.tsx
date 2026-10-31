import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  Popover,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconHeart,
  IconPlus,
  IconShield,
  IconSword,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { useRealmAccess } from 'contexts';
import {
  useAddDungeonGroupGuest,
  useAddDungeonGroupMember,
  useCharacters,
  useRemoveDungeonGroupGuest,
  useRemoveDungeonGroupMember,
  useUpdateDungeonAvailability,
  useUpdateDungeonGroupGuest,
} from 'hooks/queries';
import { useCallback, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import type { DungeonAvailability } from 'services/dungeonAvailability.service';
import type { DungeonGroup } from 'services/dungeonGroup.service';
import type { Character } from 'types/character.types';
import { DungeonRole } from 'types/common.types';
import { normalizeClass } from 'utils';

/**
 * Le membre à remplacer a déjà quitté le groupe (retiré ailleurs, cache
 * périmé) : l'état voulu est atteint, le remplacement peut continuer.
 * L'intercepteur d'apiClient rejette avec le corps d'errorHandler.
 */
const isAlreadyGone = (err: unknown) => (err as { error?: string } | null)?.error === 'not_found';

type AvailablePlayer = Character & {
  classColor: string;
  isAvailable: boolean;
  overlappingGroup: DungeonGroup | undefined;
  isAssigned: boolean;
  declaredRoles: string[];
  availabilityId: number | null;
  weekGroupMatches: DungeonGroup[];
};

interface DungeonAvailableCharactersTableProps {
  realmId: number;
  selectedGroup: DungeonGroup;
  groups: DungeonGroup[];
  availabilities: DungeonAvailability[];
  weekGroups: DungeonGroup[];
  dateStr: string;
}

type GroupMember = DungeonGroup['members'][0];
type GroupGuest = NonNullable<DungeonGroup['guests']>[0];
type SlotOccupant =
  { type: 'member'; data: GroupMember } | { type: 'guest'; data: GroupGuest } | null;

const ROLE_IMAGES: Record<string, string> = {
  TANK: '/src/character/role/tank.webp',
  HEALER: '/src/character/role/healer.webp',
  DPS: '/src/character/role/dps.webp',
};

const SLOT_DEFS = [
  { id: 'slot-TANK', role: 'TANK' as const, label: 'Tank', color: 'blue' },
  { id: 'slot-HEALER', role: 'HEALER' as const, label: 'Heal', color: 'green' },
  { id: 'slot-DPS-0', role: 'DPS' as const, label: 'DPS', color: 'orange' },
  { id: 'slot-DPS-1', role: 'DPS' as const, label: 'DPS', color: 'orange' },
  { id: 'slot-DPS-2', role: 'DPS' as const, label: 'DPS', color: 'orange' },
] as const;

const ROLE_COLORS: Record<string, string> = {
  TANK: 'blue',
  HEALER: 'green',
  DPS: 'orange',
};

const WOW_CLASSES = [
  { value: 'warrior', label: 'Guerrier' },
  { value: 'paladin', label: 'Paladin' },
  { value: 'hunter', label: 'Chasseur' },
  { value: 'rogue', label: 'Voleur' },
  { value: 'priest', label: 'Prêtre' },
  { value: 'death_knight', label: 'Chevalier de la mort' },
  { value: 'shaman', label: 'Chaman' },
  { value: 'mage', label: 'Mage' },
  { value: 'warlock', label: 'Démoniste' },
  { value: 'monk', label: 'Moine' },
  { value: 'druid', label: 'Druide' },
  { value: 'demon_hunter', label: 'Chasseur de démons' },
  { value: 'evoker', label: 'Évocateur' },
];

function getClassColor(cls: string | undefined | null): string {
  if (!cls) return 'var(--mantine-color-gray-5)';
  const key = String(cls).toLowerCase().replace(/\s+/g, '_');
  return (classColors[key as keyof typeof classColors] as string) || 'var(--mantine-color-gray-5)';
}

type State = {
  openSlotId: string | null;
  guestName: string;
  guestRole: DungeonRole;
  guestClass: string | null;
  showGuestForm: boolean;
};

const initialState: State = {
  openSlotId: null,
  guestName: '',
  guestRole: 'DPS',
  guestClass: null,
  showGuestForm: false,
};

type Action =
  | { type: 'SET_OPEN_SLOT_ID'; payload: string | null }
  | { type: 'SET_GUEST_NAME'; payload: string }
  | { type: 'SET_GUEST_ROLE'; payload: DungeonRole }
  | { type: 'SET_GUEST_CLASS'; payload: string | null }
  | { type: 'SET_SHOW_GUEST_FORM'; payload: boolean }
  | { type: 'RESET_GUEST_FORM' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_OPEN_SLOT_ID':
      return { ...state, openSlotId: action.payload };
    case 'SET_GUEST_NAME':
      return { ...state, guestName: action.payload };
    case 'SET_GUEST_ROLE':
      return { ...state, guestRole: action.payload };
    case 'SET_GUEST_CLASS':
      return { ...state, guestClass: action.payload };
    case 'SET_SHOW_GUEST_FORM':
      return { ...state, showGuestForm: action.payload };
    case 'RESET_GUEST_FORM':
      return { ...state, guestName: '', guestClass: null, showGuestForm: false };
    default:
      return state;
  }
}

export default function DungeonAvailableCharactersTable({
  realmId,
  selectedGroup,
  groups,
  availabilities,
  weekGroups,
}: DungeonAvailableCharactersTableProps) {
  const { t } = useTranslation('dungeons');
  const { canEditAll } = useRealmAccess();
  const { data: characters = [] } = useCharacters(realmId);

  const addMember = useAddDungeonGroupMember();
  const removeMember = useRemoveDungeonGroupMember();
  const addGuest = useAddDungeonGroupGuest();
  const removeGuest = useRemoveDungeonGroupGuest();
  const updateGuest = useUpdateDungeonGroupGuest();
  const updateAvailability = useUpdateDungeonAvailability();

  const [state, dispatch] = useReducer(reducer, initialState);
  const { openSlotId, guestName, guestRole, guestClass, showGuestForm } = state;
  const slotGuestMap = useMemo((): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const guest of selectedGroup.guests ?? []) {
      if (guest.slotId) {
        map[guest.slotId] = Number(guest.id);
      }
    }
    return map;
  }, [selectedGroup.guests]);

  const parseTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const groupStart = parseTime(selectedGroup.startTime);
  const groupEnd = parseTime(selectedGroup.endTime);

  const getChar = useCallback(
    (userId: string) => characters.find((c) => c.userId === userId),
    [characters],
  );

  const slotOccupants = useMemo((): Record<string, SlotOccupant> => {
    const toM = (m: GroupMember): SlotOccupant => ({ type: 'member', data: m });

    const tanks = selectedGroup.members.filter((m) => m.role === 'TANK').map(toM);
    const healers = selectedGroup.members.filter((m) => m.role === 'HEALER').map(toM);
    const dps = selectedGroup.members.filter((m) => m.role === 'DPS').map(toM);

    const guestFor = (slotId: string): SlotOccupant => {
      const guestId = slotGuestMap[slotId];
      if (!guestId) return null;
      const guest = (selectedGroup.guests ?? []).find((g) => Number(g.id) === guestId);
      return guest ? { type: 'guest', data: guest } : null;
    };

    return {
      'slot-TANK': tanks[0] ?? guestFor('slot-TANK'),
      'slot-HEALER': healers[0] ?? guestFor('slot-HEALER'),
      'slot-DPS-0': dps[0] ?? guestFor('slot-DPS-0'),
      'slot-DPS-1': dps[1] ?? guestFor('slot-DPS-1'),
      'slot-DPS-2': dps[2] ?? guestFor('slot-DPS-2'),
    };
  }, [selectedGroup.members, selectedGroup.guests, slotGuestMap]);

  const availablePlayers = useMemo(() => {
    const todayGroupIds = new Set(groups.map((g) => g.id));
    const otherDayWeekGroups = weekGroups.filter((g) => !todayGroupIds.has(g.id));
    const realmChars = characters.filter((c) => c.realmId === realmId);

    const uniqueUsers = [];

    const seenUsers = new Set();
    for (const char of realmChars) {
      if (!seenUsers.has(char.userId)) {
        seenUsers.add(char.userId);
        uniqueUsers.push(char);
      }
    }

    return uniqueUsers
      .map((char) => {
        const charAvails = availabilities.filter((a) => a.userId === char.userId);
        const validAvail = charAvails.find((avail) => {
          const availStart = parseTime(avail.startTime);
          const availEnd = parseTime(avail.endTime);
          return availStart <= groupStart && availEnd >= groupEnd;
        });
        const isAvailable = !!validAvail;

        const otherGroupAssignments = groups
          .filter((g) => g.id !== selectedGroup.id)
          .filter((g) => g.members.some((m) => m.userId === char.userId));
        const overlappingGroup = otherGroupAssignments.find((g) => {
          const gStart = parseTime(g.startTime);
          const gEnd = parseTime(g.endTime);
          return Math.max(groupStart, gStart) < Math.min(groupEnd, gEnd);
        });
        const isAssigned = selectedGroup.members.some((m) => m.userId === char.userId);

        let declaredRoles: string[] = ['DPS'];
        let availabilityId: number | null = null;
        if (validAvail) {
          availabilityId = validAvail.id;
          try {
            declaredRoles = JSON.parse(validAvail.roles);
          } catch {
            declaredRoles = ['DPS'];
          }
        }

        const weekGroupMatches = otherDayWeekGroups.filter((g) =>
          g.members.some((m) => m.userId === char.userId),
        );

        return {
          ...char,
          classColor: getClassColor(char.class),
          isAvailable,
          overlappingGroup,
          isAssigned,
          declaredRoles,
          availabilityId,
          weekGroupMatches,
        };
      })
      .filter((p) => !p.isAssigned && p.isAvailable && !p.overlappingGroup)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    characters,
    availabilities,
    selectedGroup,
    groups,
    realmId,
    groupStart,
    groupEnd,
    weekGroups,
  ]);

  const availableSlotRoles = useMemo(
    () => ({
      TANK: !slotOccupants['slot-TANK'],
      HEALER: !slotOccupants['slot-HEALER'],
      DPS:
        [
          slotOccupants['slot-DPS-0'],
          slotOccupants['slot-DPS-1'],
          slotOccupants['slot-DPS-2'],
        ].filter(Boolean).length < 3,
    }),
    [slotOccupants],
  );

  const slotCandidates = useMemo(() => {
    if (!openSlotId) return { members: [], guests: [] };
    const slot = SLOT_DEFS.find((s) => s.id === openSlotId);
    if (!slot) return { members: [], guests: [] };

    const slottedElsewhere = new Set(
      Object.entries(slotGuestMap)
        .filter(([sid]) => sid !== openSlotId)
        .map(([, gid]) => gid),
    );
    const currentOccupant = slotOccupants[openSlotId];
    const currentGuestId =
      currentOccupant?.type === 'guest' ? Number(currentOccupant.data.id) : null;

    const members = availablePlayers.filter((p) => p.declaredRoles.includes(slot.role));
    const guests = (selectedGroup.guests ?? []).filter(
      (g) => Number(g.id) !== currentGuestId && !slottedElsewhere.has(Number(g.id)),
    );

    return { members, guests };
  }, [openSlotId, availablePlayers, selectedGroup.guests, slotOccupants, slotGuestMap]);

  const handleAssignMember = useCallback(
    (player: AvailablePlayer) => {
      if (!openSlotId || !player.userId) return;
      const slot = SLOT_DEFS.find((s) => s.id === openSlotId);
      if (!slot) return;
      const currentOccupant = slotOccupants[openSlotId];

      const doAdd = () => {
        addMember.mutate({
          groupId: selectedGroup.id,
          realmId,
          userId: player.userId!,
          role: slot.role,
        });
        if (currentOccupant?.type === 'guest') {
          updateGuest.mutate({
            groupId: selectedGroup.id,
            realmId,
            guestId: Number(currentOccupant.data.id),
            payload: { slotId: null },
          });
        }
        dispatch({ type: 'SET_OPEN_SLOT_ID', payload: null });
      };

      if (currentOccupant?.type === 'member') {
        removeMember.mutate(
          { groupId: selectedGroup.id, realmId, userId: currentOccupant.data.userId },
          { onSuccess: doAdd, onError: (err) => isAlreadyGone(err) && doAdd() },
        );
      } else {
        doAdd();
      }
    },
    [openSlotId, slotOccupants, selectedGroup.id, realmId, addMember, removeMember, updateGuest],
  );

  const handleAssignGuest = useCallback(
    (guest: GroupGuest) => {
      if (!openSlotId) return;
      const currentOccupant = slotOccupants[openSlotId];
      const guestId = Number(guest.id);

      const doPlace = () => {
        if (currentOccupant?.type === 'guest') {
          updateGuest.mutate({
            groupId: selectedGroup.id,
            realmId,
            guestId: Number(currentOccupant.data.id),
            payload: { slotId: null },
          });
        }
        updateGuest.mutate({
          groupId: selectedGroup.id,
          realmId,
          guestId,
          payload: { slotId: openSlotId },
        });
        dispatch({ type: 'SET_OPEN_SLOT_ID', payload: null });
      };

      if (currentOccupant?.type === 'member') {
        removeMember.mutate(
          { groupId: selectedGroup.id, realmId, userId: currentOccupant.data.userId },
          { onSuccess: doPlace, onError: (err) => isAlreadyGone(err) && doPlace() },
        );
      } else {
        doPlace();
      }
    },
    [openSlotId, slotOccupants, selectedGroup.id, realmId, removeMember, updateGuest],
  );

  const handleRemoveOccupant = useCallback(
    (slotId: string) => {
      const occupant = slotOccupants[slotId];
      if (!occupant) return;
      if (occupant.type === 'member') {
        removeMember.mutate({ groupId: selectedGroup.id, realmId, userId: occupant.data.userId });
      } else {
        updateGuest.mutate({
          groupId: selectedGroup.id,
          realmId,
          guestId: Number(occupant.data.id),
          payload: { slotId: null },
        });
      }
      dispatch({ type: 'SET_OPEN_SLOT_ID', payload: null });
    },
    [slotOccupants, selectedGroup.id, realmId, removeMember, updateGuest],
  );

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    addGuest.mutate(
      {
        groupId: selectedGroup.id,
        realmId,
        payload: { name: guestName.trim(), role: guestRole, class: guestClass ?? undefined },
      },
      {
        onSuccess: () => {
          dispatch({ type: 'RESET_GUEST_FORM' });
        },
      },
    );
  };

  const totalOccupied = selectedGroup.members.length + (selectedGroup.guests?.length ?? 0);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Composition — {totalOccupied} / 5
        </Text>

        <div style={{ display: 'flex', gap: 8 }}>
          {SLOT_DEFS.map((slot) => {
            const occupant = slotOccupants[slot.id];
            const isOccupied = !!occupant;
            const isOpen = openSlotId === slot.id;

            const occupantChar = occupant?.type === 'member' ? getChar(occupant.data.userId) : null;
            const occupantName =
              occupant?.type === 'member'
                ? occupantChar?.name || occupant.data.userId
                : occupant?.type === 'guest'
                  ? occupant.data.name
                  : null;
            const occupantClass =
              occupant?.type === 'member'
                ? occupantChar?.class
                : occupant?.type === 'guest'
                  ? occupant.data.class
                  : null;

            return (
              <Popover
                key={slot.id}
                opened={isOpen}
                onChange={(o) =>
                  dispatch({ type: 'SET_OPEN_SLOT_ID', payload: o ? slot.id : null })
                }
                position="bottom"
                withArrow
                shadow="md"
                withinPortal
              >
                <Popover.Target>
                  <div
                    onClick={() =>
                      dispatch({ type: 'SET_OPEN_SLOT_ID', payload: isOpen ? null : slot.id })
                    }
                    style={{
                      flex: '1 1 0',
                      minWidth: 110,
                      height: 170,
                      border: isOpen
                        ? `2px solid var(--mantine-color-${slot.color}-5)`
                        : isOccupied
                          ? `1.5px solid var(--mantine-color-${slot.color}-8)`
                          : `1.5px dashed var(--mantine-color-dark-4)`,
                      borderRadius: 10,
                      backgroundColor: isOpen
                        ? `color-mix(in srgb, var(--mantine-color-${slot.color}-9) 30%, transparent)`
                        : isOccupied
                          ? 'rgba(0,0,0,0.2)'
                          : 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'border-color 0.1s, background-color 0.1s',
                      boxSizing: 'border-box',
                    }}
                  >
                    {isOccupied && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          borderRadius: '10px 10px 0 0',
                          backgroundColor: `var(--mantine-color-${slot.color}-6)`,
                        }}
                      />
                    )}

                    {isOccupied && (
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        style={{ position: 'absolute', top: 6, right: 6, zIndex: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOccupant(slot.id);
                        }}
                      >
                        <IconX size={10} />
                      </ActionIcon>
                    )}

                    {isOccupied ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          padding: '12px 8px',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        {occupantClass ? (
                          <img
                            src={`/src/character/class/${normalizeClass(occupantClass)}-icon.svg`}
                            alt={String(occupantClass)}
                            style={{ width: 30, height: 30 }}
                          />
                        ) : (
                          <img
                            src={ROLE_IMAGES[slot.role]}
                            alt={slot.label}
                            style={{ width: 30, height: 30, opacity: 0.7 }}
                          />
                        )}
                        <Text
                          size="xs"
                          fw={700}
                          ta="center"
                          lineClamp={1}
                          style={{
                            color: getClassColor(occupantClass),
                            maxWidth: '100%',
                            paddingInline: 4,
                          }}
                        >
                          {occupantName}
                        </Text>
                        <Group gap={4}>
                          <Badge variant="light" color={slot.color} size="xs">
                            {slot.label}
                          </Badge>
                          {occupant?.type === 'guest' && (
                            <Badge variant="light" color="violet" size="xs">
                              invité
                            </Badge>
                          )}
                        </Group>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 4px',
                        }}
                      >
                        <img
                          src={ROLE_IMAGES[slot.role]}
                          alt={slot.label}
                          style={{
                            width: 36,
                            height: 36,
                            opacity: isOpen ? 0.9 : 0.3,
                            transition: 'opacity 0.1s',
                          }}
                        />
                        <Text
                          size="xs"
                          fw={700}
                          c={isOpen ? `${slot.color}.4` : 'dimmed'}
                          ta="center"
                        >
                          {slot.label}
                        </Text>
                      </div>
                    )}
                  </div>
                </Popover.Target>

                <Popover.Dropdown p={0} style={{ minWidth: 220, maxWidth: 280 }}>
                  <ScrollArea.Autosize mah={320}>
                    <Stack gap={0}>
                      {isOccupied && (
                        <>
                          <Group
                            px={12}
                            py={8}
                            gap={8}
                            style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}
                          >
                            <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                              Retirer :
                            </Text>
                            <Text size="xs" fw={700} lineClamp={1}>
                              {occupantName}
                            </Text>
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveOccupant(slot.id);
                              }}
                            >
                              <IconX size={11} />
                            </ActionIcon>
                          </Group>
                          {(slotCandidates.members.length > 0 ||
                            slotCandidates.guests.length > 0) && (
                            <Text size="xs" c="dimmed" px={12} pt={8} pb={2}>
                              Remplacer par :
                            </Text>
                          )}
                        </>
                      )}

                      {slotCandidates.members.map((player) => (
                        <UnstyledButton
                          key={player.userId}
                          onClick={() => handleAssignMember(player)}
                          style={{ width: '100%' }}
                        >
                          <Group
                            px={12}
                            py={8}
                            gap={8}
                            style={{
                              borderRadius: 0,
                              transition: 'background-color 0.1s',
                            }}
                            className="slot-candidate-row"
                          >
                            <img
                              src={`/src/character/class/${normalizeClass(player.class)}-icon.svg`}
                              alt={String(player.class || '')}
                              style={{ width: 18, height: 18, flexShrink: 0 }}
                            />
                            <Text size="sm" fw={600} style={{ color: player.classColor, flex: 1 }}>
                              {player.name}
                            </Text>
                            {player.weekGroupMatches.length > 0 && (
                              <Tooltip
                                label={player.weekGroupMatches
                                  .map((g: DungeonGroup) => {
                                    const d = new Date(g.date);
                                    return `${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • ${g.startTime.slice(0, 5)}-${g.endTime.slice(0, 5)}`;
                                  })
                                  .join('\n')}
                                withArrow
                                multiline
                                maw={200}
                              >
                                <IconAlertTriangle
                                  size={12}
                                  color="var(--mantine-color-yellow-5)"
                                />
                              </Tooltip>
                            )}
                          </Group>
                        </UnstyledButton>
                      ))}

                      {slotCandidates.guests.length > 0 && (
                        <>
                          <Divider
                            label={
                              <Text size="xs" c="dimmed">
                                Invités
                              </Text>
                            }
                            labelPosition="left"
                            mx={8}
                          />
                          {slotCandidates.guests.map((guest) => (
                            <UnstyledButton
                              key={guest.id}
                              onClick={() => handleAssignGuest(guest)}
                              style={{ width: '100%' }}
                            >
                              <Group px={12} py={8} gap={8}>
                                {guest.class ? (
                                  <img
                                    src={`/src/character/class/${guest.class}-icon.svg`}
                                    alt={String(guest.class)}
                                    style={{ width: 18, height: 18, flexShrink: 0 }}
                                  />
                                ) : (
                                  <IconUserPlus size={16} color="var(--mantine-color-violet-4)" />
                                )}
                                <Text size="sm" fw={600} c="violet.3" style={{ flex: 1 }}>
                                  {guest.name}
                                </Text>
                                <Badge variant="light" color={ROLE_COLORS[guest.role]} size="xs">
                                  {guest.role[0]}
                                </Badge>
                                {guest.role !== slot.role && (
                                  <Text size="xs" c="dimmed">
                                    → {slot.role[0]}
                                  </Text>
                                )}
                              </Group>
                            </UnstyledButton>
                          ))}
                        </>
                      )}

                      {!isOccupied &&
                        slotCandidates.members.length === 0 &&
                        slotCandidates.guests.length === 0 && (
                          <Text size="xs" c="dimmed" fs="italic" p={12} ta="center">
                            Aucun joueur disponible pour ce rôle
                          </Text>
                        )}
                    </Stack>
                  </ScrollArea.Autosize>
                </Popover.Dropdown>
              </Popover>
            );
          })}
        </div>
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          {t('composer.availableCharacters')} — {availablePlayers.length}
        </Text>

        {availablePlayers.length === 0 ? (
          <Text size="xs" c="dimmed" fs="italic" ta="center" py="xs">
            Aucun joueur disponible
          </Text>
        ) : (
          <SimpleGrid cols={3} spacing={4}>
            {availablePlayers.map((player) => (
              <Group
                key={player.userId}
                gap={6}
                px={8}
                py={6}
                style={{
                  borderRadius: 6,
                  border: '1px solid var(--mantine-color-dark-4)',
                  backgroundColor: 'var(--mantine-color-dark-7)',
                }}
              >
                <img
                  src={`/src/character/class/${normalizeClass(player.class)}-icon.svg`}
                  alt={String(player.class || '')}
                  style={{ width: 18, height: 18, flexShrink: 0 }}
                />
                <Text
                  fw={600}
                  size="xs"
                  style={{ color: player.classColor, flex: 1, minWidth: 0 }}
                  lineClamp={1}
                >
                  {player.name}
                </Text>

                {player.weekGroupMatches.length > 0 && (
                  <Tooltip
                    label={player.weekGroupMatches
                      .map((g: DungeonGroup) => {
                        const d = new Date(g.date);
                        return `${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • ${g.startTime.slice(0, 5)}-${g.endTime.slice(0, 5)} (${g.type})`;
                      })
                      .join('\n')}
                    withArrow
                    position="top"
                    multiline
                    maw={240}
                  >
                    <IconAlertTriangle
                      size={12}
                      color="var(--mantine-color-yellow-5)"
                      style={{ flexShrink: 0 }}
                    />
                  </Tooltip>
                )}

                <Group gap={2} style={{ flexShrink: 0 }}>
                  {player.declaredRoles.map((role: string) => (
                    <Badge key={role} variant="light" color={ROLE_COLORS[role]} size="xs">
                      {role[0]}
                    </Badge>
                  ))}
                </Group>

                {(() => {
                  const validRoles = (['TANK', 'HEALER', 'DPS'] as const).filter(
                    (r) => availableSlotRoles[r] && player.declaredRoles.includes(r),
                  );
                  const missingRoles = (['TANK', 'HEALER', 'DPS'] as const).filter(
                    (r) => !player.declaredRoles.includes(r),
                  );
                  const canForce = canEditAll && player.availabilityId && missingRoles.length > 0;

                  if (validRoles.length === 0 && !canForce) return null;

                  return (
                    <Menu shadow="md" position="left-start" withinPortal>
                      <Menu.Target>
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          style={{ flexShrink: 0 }}
                        >
                          {validRoles.length === 1 && !canForce ? (
                            <IconPlus size={11} />
                          ) : (
                            <IconChevronDown size={11} />
                          )}
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {validRoles.length > 0 && (
                          <>
                            {validRoles.map((r) => (
                              <Menu.Item
                                key={r}
                                color={ROLE_COLORS[r]}
                                leftSection={
                                  r === 'TANK' ? (
                                    <IconShield size={14} />
                                  ) : r === 'HEALER' ? (
                                    <IconHeart size={14} />
                                  ) : (
                                    <IconSword size={14} />
                                  )
                                }
                                onClick={() =>
                                  addMember.mutate({
                                    groupId: selectedGroup.id,
                                    realmId,
                                    userId: player.userId ? player.userId : '',
                                    role: r,
                                  })
                                }
                              >
                                {r === 'HEALER' ? 'Heal' : r === 'TANK' ? 'Tank' : 'DPS'}
                              </Menu.Item>
                            ))}
                          </>
                        )}
                        {canForce && (
                          <>
                            {validRoles.length > 0 && <Menu.Divider />}
                            <Menu.Label>{t('composer.addRole')}</Menu.Label>
                            {missingRoles.map((r) => (
                              <Menu.Item
                                key={`force-${r}`}
                                color={ROLE_COLORS[r]}
                                leftSection={
                                  r === 'TANK' ? (
                                    <IconShield size={14} />
                                  ) : r === 'HEALER' ? (
                                    <IconHeart size={14} />
                                  ) : (
                                    <IconSword size={14} />
                                  )
                                }
                                onClick={() => {
                                  if (!player.availabilityId) return;
                                  updateAvailability.mutate({
                                    id: player.availabilityId,
                                    realmId,
                                    payload: {
                                      roles: [...player.declaredRoles, r],
                                    },
                                  });
                                }}
                              >
                                {r === 'HEALER' ? 'Heal' : r === 'TANK' ? 'Tank' : 'DPS'}
                              </Menu.Item>
                            ))}
                          </>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  );
                })()}
              </Group>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <Divider />
      <Group justify="space-between" align="center">
        <Group gap={6}>
          <IconUserPlus size={16} color="var(--mantine-color-violet-4)" />
          <Text fw={600} size="sm" c="violet.4">
            Invités ({selectedGroup.guests?.length ?? 0})
          </Text>
        </Group>
        {!showGuestForm && (
          <Button
            variant="light"
            color="violet"
            size="compact-xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => dispatch({ type: 'SET_SHOW_GUEST_FORM', payload: true })}
          >
            Ajouter un invité
          </Button>
        )}
      </Group>

      {showGuestForm && (
        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            placeholder="Nom du joueur"
            value={guestName}
            onChange={(e) => dispatch({ type: 'SET_GUEST_NAME', payload: e.currentTarget.value })}
            size="xs"
            style={{ flex: '1 1 140px', minWidth: 120 }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
            autoFocus
          />
          <Select
            placeholder="Classe"
            value={guestClass}
            onChange={(v) => dispatch({ type: 'SET_GUEST_CLASS', payload: v })}
            size="xs"
            clearable
            style={{ flex: '1 1 160px', minWidth: 140 }}
            data={WOW_CLASSES}
            renderOption={({ option }) => (
              <Group gap={6} wrap="nowrap">
                <img
                  src={`/src/character/class/${option.value}-icon.svg`}
                  alt={option.label}
                  style={{ width: 14, height: 14, flexShrink: 0 }}
                />
                <Text size="xs">{option.label}</Text>
              </Group>
            )}
          />
          <SegmentedControl
            value={guestRole}
            onChange={(value) =>
              dispatch({ type: 'SET_GUEST_ROLE', payload: value as DungeonRole })
            }
            size="xs"
            data={[
              { label: 'Tank', value: 'TANK' },
              { label: 'Heal', value: 'HEALER' },
              { label: 'DPS', value: 'DPS' },
            ]}
          />
          <Button
            size="compact-xs"
            color="violet"
            loading={addGuest.isPending}
            disabled={!guestName.trim()}
            onClick={handleAddGuest}
          >
            Ajouter
          </Button>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => {
              dispatch({ type: 'RESET_GUEST_FORM' });
            }}
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
      )}

      {(selectedGroup.guests?.length ?? 0) > 0 && (
        <Stack gap={4}>
          {selectedGroup.guests.map((guest) => (
            <Group
              key={guest.id}
              gap={8}
              px={10}
              py={6}
              style={{
                borderRadius: 6,
                border: '1px solid var(--mantine-color-violet-9)',
                backgroundColor: 'rgba(148, 100, 237, 0.08)',
              }}
            >
              {guest.class ? (
                <img
                  src={`/src/character/class/${guest.class}-icon.svg`}
                  alt={String(guest.class)}
                  style={{ width: 20, height: 20, flexShrink: 0 }}
                />
              ) : (
                <IconUserPlus
                  size={16}
                  color="var(--mantine-color-violet-4)"
                  style={{ flexShrink: 0 }}
                />
              )}
              <Text fw={600} size="sm" c="violet.3" style={{ flex: 1 }}>
                {guest.name}
              </Text>
              <Text size="xs" c="dimmed" fs="italic">
                invité
              </Text>
              <Badge variant="light" color={ROLE_COLORS[guest.role]} size="xs">
                {guest.role[0]}
              </Badge>
              <ActionIcon
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => {
                  removeGuest.mutate({
                    groupId: selectedGroup.id,
                    realmId,
                    guestId: Number(guest.id),
                  });
                }}
              >
                <IconX size={12} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
