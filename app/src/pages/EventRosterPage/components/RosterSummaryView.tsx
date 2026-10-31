import {
  Avatar,
  Badge,
  Box,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import React, { useMemo } from 'react';
import type { RaidGuest, RaidGuestAssignment } from 'services/event.service';
import type { PoolCharacter, RosterAssignment } from 'services/roster.service';
import { normalizeClass } from 'utils';

interface RosterSummaryViewProps {
  bosses: { id: number; name: string; icon: string }[];
  players: PoolCharacter[];
  assignments: RosterAssignment[];
  currentUserId?: string | number | null;
  guests?: RaidGuest[];
  guestAssignments?: RaidGuestAssignment[];
  difficulty?: string;
}

const ROLES = {
  TANK: 'TANK',
  HEALER: 'HEALER',
  MELEE: 'MELEE',
  RANGED: 'RANGED',
} as const;

const ROLE_COLORS: Record<string, string> = {
  TANK: 'blue',
  HEALER: 'green',
  MELEE: 'red',
  RANGED: 'orange',
};

const EMPTY_GUESTS: RaidGuest[] = [];
const EMPTY_GUEST_ASSIGNMENTS: RaidGuestAssignment[] = [];

export const RosterSummaryView: React.FC<RosterSummaryViewProps> = ({
  bosses,
  players,
  assignments,
  currentUserId,
  guests = EMPTY_GUESTS,
  guestAssignments = EMPTY_GUEST_ASSIGNMENTS,
  difficulty,
}) => {
  const maxPlayers = difficulty === 'mythic' ? 20 : 35;
  const userAssignments = useMemo(() => {
    if (!currentUserId) return [];
    return assignments.filter((a) => String(a.character?.userId) === String(currentUserId));
  }, [assignments, currentUserId]);

  const getAssignmentsForBoss = (bossId: number) => {
    return assignments.filter((a) => a.bossId === bossId);
  };

  const getTransitions = (bossIdx: number) => {
    if (bossIdx === 0) return { in: [], out: [] };

    const prevBoss = bosses[bossIdx - 1];
    const currBoss = bosses[bossIdx];

    const prevIds = new Set(getAssignmentsForBoss(prevBoss.id).map((a) => a.characterId));
    const currIds = new Set(getAssignmentsForBoss(currBoss.id).map((a) => a.characterId));

    const comingIn = Array.from(currIds).filter((id) => !prevIds.has(id));
    const goingOut = Array.from(prevIds).filter((id) => !currIds.has(id));

    return {
      in: players.filter((p) => comingIn.includes(p.id)),
      out: players.filter((p) => goingOut.includes(p.id)),
    };
  };

  return (
    <Box h="calc(100vh - 120px)">
      <ScrollArea h="100%" p="md">
        <Group align="flex-start" wrap="nowrap" gap="sm" grow>
          {bosses.map((boss, idx) => {
            const bossAssignments = getAssignmentsForBoss(boss.id);
            const bossGuestCount = guestAssignments.filter((a) => a.bossId === boss.id).length;
            const transitions = getTransitions(idx);

            const userAssignment = userAssignments.find((a) => a.bossId === boss.id);
            const isAssigned = !!userAssignment;

            const tanks = bossAssignments.filter((a) => a.role === ROLES.TANK);
            const heals = bossAssignments.filter((a) => a.role === ROLES.HEALER);
            const dpsM = bossAssignments.filter((a) => a.role === ROLES.MELEE);
            const dpsR = bossAssignments.filter((a) => a.role === ROLES.RANGED);

            return (
              <Stack key={boss.id} gap="xs" style={{ flex: 1, minWidth: 200 }}>
                {/* Personal Status Header */}
                <Paper
                  p={6}
                  radius="md"
                  bg={isAssigned ? 'dark.6' : 'transparent'}
                  withBorder={isAssigned}
                  style={{
                    opacity: isAssigned ? 1 : 0.3,
                    borderLeft: isAssigned
                      ? `4px solid var(--mantine-color-${ROLE_COLORS[userAssignment.role]}-filled)`
                      : 'none',
                    transition: 'all 0.2s ease',
                    marginBottom: 4,
                    height: 32, // Fixed height for perfect alignment
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Group justify="center" gap="xs" wrap="nowrap">
                    <Text size="10px" fw={900} c={isAssigned ? 'white' : 'dimmed'} tt="uppercase">
                      {isAssigned ? 'IN' : 'OUT'}
                    </Text>
                    {isAssigned && (
                      <Badge
                        size="xs"
                        color={ROLE_COLORS[userAssignment.role]}
                        variant="filled"
                        radius="md"
                      >
                        {userAssignment.role}
                      </Badge>
                    )}
                  </Group>
                </Paper>

                <Paper
                  shadow="xl"
                  radius="md"
                  withBorder
                  bg="dark.7"
                  style={{ overflow: 'hidden', minHeight: 480 }}
                >
                  <Box
                    p="xs"
                    bg="dark.6"
                    style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}
                  >
                    <Stack gap={4} align="center">
                      <Avatar src={boss.icon} size="md" radius="sm" />
                      <Text fw={900} size="xs" truncate ta="center" style={{ width: '100%' }}>
                        {boss.name}
                      </Text>
                      <Badge color="brand.5" size="xs">
                        {bossAssignments.length + bossGuestCount}/{maxPlayers}
                      </Badge>
                    </Stack>
                  </Box>

                  <Stack p="xs" gap="sm">
                    {(() => {
                      const bossGuests = guestAssignments
                        .filter((a) => a.bossId === boss.id)
                        .map((a) => ({
                          assignment: a,
                          guest: guests.find((g) => g.id === a.guestId),
                        }))
                        .filter((x) => !!x.guest);

                      if (bossGuests.length === 0) return null;
                      return (
                        <Box>
                          <Text size="10px" fw={900} c="teal.4" tt="uppercase" mb={2}>
                            Invités ({bossGuests.length})
                          </Text>
                          <Stack gap={2}>
                            {bossGuests.map(({ assignment, guest }) => (
                              <Group
                                key={assignment.id}
                                gap={4}
                                wrap="nowrap"
                                p={2}
                                bg="rgba(0,128,128,0.1)"
                                style={{ borderRadius: 2 }}
                              >
                                {guest!.class ? (
                                  <img
                                    src={`/src/character/class/${guest!.class.toLowerCase().replace(/\s+/g, '_')}-icon.svg`}
                                    alt={guest!.class}
                                    style={{ width: 12, height: 12 }}
                                  />
                                ) : (
                                  <Text size="10px" c="dimmed">
                                    👤
                                  </Text>
                                )}
                                <Text size="10px" fw={700} c="teal.3" truncate>
                                  {guest!.name}
                                </Text>
                              </Group>
                            ))}
                          </Stack>
                        </Box>
                      );
                    })()}
                    <Box>
                      <Text size="10px" fw={900} c="blue.4" tt="uppercase" mb={2}>
                        Tanks ({tanks.length})
                      </Text>
                      <Stack gap={2}>
                        {tanks.map((a) => (
                          <Group
                            key={a.characterId}
                            gap={4}
                            wrap="nowrap"
                            p={2}
                            bg="rgba(0,0,0,0.2)"
                            style={{ borderRadius: 2 }}
                          >
                            <img
                              src={`/src/character/class/${normalizeClass(a.character?.class || '')}-icon.svg`}
                              style={{ width: 12, height: 12 }}
                              alt=""
                            />
                            <Text
                              size="10px"
                              fw={700}
                              truncate
                              className={`class-${a.character?.class}`}
                            >
                              {a.character?.name}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Box>

                    <Box>
                      <Text size="10px" fw={900} c="green.4" tt="uppercase" mb={2}>
                        Heals ({heals.length})
                      </Text>
                      <Stack gap={2}>
                        {heals.map((a) => (
                          <Group
                            key={a.characterId}
                            gap={4}
                            wrap="nowrap"
                            p={2}
                            bg="rgba(0,0,0,0.2)"
                            style={{ borderRadius: 2 }}
                          >
                            <img
                              src={`/src/character/class/${normalizeClass(a.character?.class || '')}-icon.svg`}
                              style={{ width: 12, height: 12 }}
                              alt=""
                            />
                            <Text
                              size="10px"
                              fw={700}
                              truncate
                              className={`class-${a.character?.class}`}
                            >
                              {a.character?.name}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Box>

                    <Box>
                      <Text size="10px" fw={900} c="red.4" tt="uppercase" mb={2}>
                        Melee ({dpsM.length})
                      </Text>
                      <Stack gap={2}>
                        {dpsM.map((a) => (
                          <Group
                            key={a.characterId}
                            gap={4}
                            wrap="nowrap"
                            p={2}
                            bg="rgba(0,0,0,0.2)"
                            style={{ borderRadius: 2 }}
                          >
                            <img
                              src={`/src/character/class/${normalizeClass(a.character?.class || '')}-icon.svg`}
                              style={{ width: 12, height: 12 }}
                              alt=""
                            />
                            <Text
                              size="10px"
                              fw={700}
                              truncate
                              className={`class-${a.character?.class}`}
                            >
                              {a.character?.name}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Box>

                    <Box>
                      <Text size="10px" fw={900} c="orange.4" tt="uppercase" mb={2}>
                        Range ({dpsR.length})
                      </Text>
                      <Stack gap={2}>
                        {dpsR.map((a) => (
                          <Group
                            key={a.characterId}
                            gap={4}
                            wrap="nowrap"
                            p={2}
                            bg="rgba(0,0,0,0.2)"
                            style={{ borderRadius: 2 }}
                          >
                            <img
                              src={`/src/character/class/${normalizeClass(a.character?.class || '')}-icon.svg`}
                              style={{ width: 12, height: 12 }}
                              alt=""
                            />
                            <Text
                              size="10px"
                              fw={700}
                              truncate
                              className={`class-${a.character?.class}`}
                            >
                              {a.character?.name}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>

                {idx > 0 && (
                  <Stack gap={4}>
                    <Divider
                      label={
                        <Text size="10px" fw={800} c="dimmed">
                          TRANSITION
                        </Text>
                      }
                      labelPosition="center"
                    />
                    <Group grow gap="xs">
                      {transitions.in.length > 0 && (
                        <Paper
                          p={4}
                          radius="xs"
                          bg="rgba(40, 167, 69, 0.05)"
                          withBorder
                          style={{ borderColor: 'rgba(40, 167, 69, 0.2)' }}
                        >
                          <Text size="9px" fw={800} c="green.4" tt="uppercase" ta="center">
                            IN +{transitions.in.length}
                          </Text>
                          <Group gap={4} justify="center">
                            {transitions.in.map((p) => (
                              <Text key={p.id} size="9px" fw={700} className={`class-${p.class}`}>
                                {p.name}
                              </Text>
                            ))}
                          </Group>
                        </Paper>
                      )}
                      {transitions.out.length > 0 && (
                        <Paper
                          p={4}
                          radius="xs"
                          bg="rgba(220, 53, 69, 0.05)"
                          withBorder
                          style={{ borderColor: 'rgba(220, 53, 69, 0.2)' }}
                        >
                          <Text size="9px" fw={800} c="red.4" tt="uppercase" ta="center">
                            OUT -{transitions.out.length}
                          </Text>
                          <Group gap={4} justify="center">
                            {transitions.out.map((p) => (
                              <Text key={p.id} size="9px" fw={700} className={`class-${p.class}`}>
                                {p.name}
                              </Text>
                            ))}
                          </Group>
                        </Paper>
                      )}
                    </Group>
                    {transitions.in.length === 0 && transitions.out.length === 0 && (
                      <Text size="9px" c="dimmed" fs="italic" ta="center">
                        No change
                      </Text>
                    )}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Group>
      </ScrollArea>
    </Box>
  );
};
