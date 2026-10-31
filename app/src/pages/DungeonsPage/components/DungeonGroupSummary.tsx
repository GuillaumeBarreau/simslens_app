import { Badge, Box, Card, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import { IconHeart, IconShield, IconSword, IconUserPlus } from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { useTranslation } from 'react-i18next';
import type { DungeonGroup } from 'services/dungeonGroup.service';
import { normalizeClass } from 'utils';

interface DungeonGroupSummaryProps {
  groups: DungeonGroup[];
  characters: any[];
  realmId: number;
  currentUserId?: string | number | null;
}

const GROUP_COLORS = ['orange', 'cyan', 'grape', 'lime', 'pink', 'yellow', 'indigo', 'teal'];

const ROLE_ICONS = {
  TANK: <IconShield size={12} />,
  HEALER: <IconHeart size={12} />,
  DPS: <IconSword size={12} />,
};
const ROLE_COLORS = { TANK: 'blue.4', HEALER: 'green.4', DPS: 'orange.4' };

/** Derive the display role from slotId (set by admin in composer), fallback to role field */
function getGuestDisplayRole(guest: any): 'TANK' | 'HEALER' | 'DPS' {
  const slotId = guest.slotId as string | null | undefined;
  if (slotId) {
    if (slotId.startsWith('slot-TANK')) return 'TANK';
    if (slotId.startsWith('slot-HEALER')) return 'HEALER';
    if (slotId.startsWith('slot-DPS')) return 'DPS';
  }
  return guest.role as 'TANK' | 'HEALER' | 'DPS';
}

function MemberRow({ member, characters }: { member: any; characters: any[] }) {
  const char = characters.find((c) => c.userId === member.userId);
  const name = char?.name || member.userId;

  let classColor = 'var(--mantine-color-gray-5)';
  if (char?.class) {
    const key = String(char.class).toLowerCase().replace(/\s+/g, '_');
    const cc = classColors[key as keyof typeof classColors];
    if (cc) classColor = cc;
  }

  return (
    <Group
      gap={6}
      wrap="nowrap"
      px={6}
      py={2}
      style={{ borderRadius: 4, backgroundColor: 'var(--mantine-color-dark-6)' }}
    >
      {char?.class && (
        <img
          src={`/src/character/class/${normalizeClass(char.class)}-icon.svg`}
          alt={String(char.class)}
          style={{ width: 14, height: 14, flexShrink: 0 }}
        />
      )}
      <Text size="xs" fw={600} lineClamp={1} style={{ color: classColor, flex: 1 }}>
        {name}
      </Text>
    </Group>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      px={6}
      py={2}
      style={{ borderRadius: 4, border: '1px dashed var(--mantine-color-dark-4)' }}
    >
      <Text size="xs" c="dimmed" fs="italic">
        {label}
      </Text>
    </Group>
  );
}

function GuestRow({ guest }: { guest: any }) {
  return (
    <Badge
      variant="light"
      color="teal"
      radius="sm"
      px={6}
      py={2}
      style={{
        textTransform: 'none',
        height: 'auto',
        justifyContent: 'flex-start',
        border: 'none',
        flex: 1,
      }}
      leftSection={
        guest.class ? (
          <img
            src={`/src/character/class/${guest.class}-icon.svg`}
            alt={String(guest.class)}
            style={{ width: 14, height: 14, display: 'block' }}
          />
        ) : (
          <IconUserPlus size={12} style={{ display: 'block' }} />
        )
      }
    >
      <Text size="xs" fw={600} lineClamp={1}>
        {guest.name}
      </Text>
    </Badge>
  );
}

export default function DungeonGroupSummary({
  groups,
  characters,
  currentUserId,
}: DungeonGroupSummaryProps) {
  const { t } = useTranslation('dungeons');

  if (groups.length === 0) return null;

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Text fw={600} size="sm" mb="sm" c="orange.4">
        {t('composer.groups')} — {groups.length}
      </Text>

      <ScrollArea offsetScrollbars scrollbarSize={6}>
        <Group gap="md" align="stretch" wrap="nowrap" pb={4}>
          {groups.map((group, idx) => {
            const color = GROUP_COLORS[idx % GROUP_COLORS.length];
            const isConfirmed = group.status === 'CONFIRMED';
            const myUserId = currentUserId ? String(currentUserId) : null;
            const isInGroup = myUserId
              ? group.members.some((m) => String(m.userId) === myUserId)
              : false;

            const tanks = group.members.filter((m) => m.role === 'TANK');
            const healers = group.members.filter((m) => m.role === 'HEALER');
            const dps = group.members.filter((m) => m.role === 'DPS');
            const guests = group.guests ?? [];

            return (
              <Paper
                key={group.id}
                withBorder
                radius="md"
                p={0}
                style={{
                  minWidth: 180,
                  flex: '1 1 180px',
                  borderColor: isConfirmed
                    ? 'var(--mantine-color-green-8)'
                    : `var(--mantine-color-${color}-8)`,
                  borderWidth: 1,
                  overflow: 'hidden',
                }}
              >
                <Box style={{ height: 3, backgroundColor: `var(--mantine-color-${color}-6)` }} />

                <Stack gap={8} p="xs">
                  <Group gap={4} justify="space-between">
                    <Group gap={4}>
                      <Badge color={color} variant="filled" size="xs">
                        G{idx + 1}
                      </Badge>
                      <Badge
                        variant="light"
                        color={group.type === 'M+' ? 'orange' : 'blue'}
                        size="xs"
                      >
                        {group.type}
                      </Badge>
                    </Group>
                    {isConfirmed && (
                      <Badge color="green" variant="light" size="xs">
                        ✓
                      </Badge>
                    )}
                  </Group>

                  <Text size="xs" fw={700} c="dimmed">
                    {group.startTime.slice(0, 5)} → {group.endTime.slice(0, 5)}
                  </Text>

                  <Box
                    px={6}
                    py={3}
                    style={{
                      borderRadius: 4,
                      borderLeft: `3px solid ${isInGroup ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-dark-4)'}`,
                      backgroundColor: isInGroup
                        ? 'rgba(64, 192, 87, 0.08)'
                        : 'var(--mantine-color-dark-7)',
                      opacity: isInGroup ? 1 : 0.5,
                    }}
                  >
                    <Text size="xs" fw={700} c={isInGroup ? 'green.4' : 'dimmed'}>
                      {isInGroup ? t('composer.confirmed') : t('composer.draft')}
                    </Text>
                  </Box>

                  <Stack gap={6}>
                    {(() => {
                      const tankGuests = guests.filter((g) => getGuestDisplayRole(g) === 'TANK');
                      const total = tanks.length + tankGuests.length;
                      return (
                        <Stack gap={3}>
                          <Group gap={4}>
                            {ROLE_ICONS.TANK}
                            <Text size="xs" fw={700} c={ROLE_COLORS.TANK}>
                              {t('composer.tank')} ({total}/1)
                            </Text>
                          </Group>
                          {tanks.map((m) => (
                            <MemberRow key={m.userId} member={m} characters={characters} />
                          ))}
                          {tankGuests.map((g) => (
                            <GuestRow key={`guest-tank-${g.id}`} guest={g} />
                          ))}
                          {total === 0 && <EmptySlot label={t('composer.emptySlot')} />}
                        </Stack>
                      );
                    })()}

                    {(() => {
                      const healGuests = guests.filter((g) => getGuestDisplayRole(g) === 'HEALER');
                      const total = healers.length + healGuests.length;
                      return (
                        <Stack gap={3}>
                          <Group gap={4}>
                            {ROLE_ICONS.HEALER}
                            <Text size="xs" fw={700} c={ROLE_COLORS.HEALER}>
                              {t('composer.healer')} ({total}/1)
                            </Text>
                          </Group>
                          {healers.map((m) => (
                            <MemberRow key={m.userId} member={m} characters={characters} />
                          ))}
                          {healGuests.map((g) => (
                            <GuestRow key={`guest-heal-${g.id}`} guest={g} />
                          ))}
                          {total === 0 && <EmptySlot label={t('composer.emptySlot')} />}
                        </Stack>
                      );
                    })()}

                    {(() => {
                      const dpsGuests = guests.filter((g) => getGuestDisplayRole(g) === 'DPS');
                      const total = dps.length + dpsGuests.length;
                      return (
                        <Stack gap={3}>
                          <Group gap={4}>
                            {ROLE_ICONS.DPS}
                            <Text size="xs" fw={700} c={ROLE_COLORS.DPS}>
                              DPS ({total}/3)
                            </Text>
                          </Group>
                          {dps.map((m) => (
                            <MemberRow key={m.userId} member={m} characters={characters} />
                          ))}
                          {dpsGuests.map((g) => (
                            <GuestRow key={`guest-dps-${g.id}`} guest={g} />
                          ))}
                          {Array.from({ length: Math.max(0, 3 - total) }).map((_, i) => (
                            <EmptySlot key={i} label={t('composer.emptySlot')} />
                          ))}
                        </Stack>
                      );
                    })()}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Group>
      </ScrollArea>
    </Card>
  );
}
