import { Badge, Box, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconHeart, IconShield, IconSword, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import dayjs from 'dayjs';
import { useRouteParams } from 'hooks/useRouteParams';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type {
  DungeonGroup,
  DungeonGroupGuest,
  DungeonGroupMember,
} from 'services/dungeonGroup.service';
import { normalizeClass } from 'utils';

import { ActivityEmptyState, ActivitySection } from './ActivitySection';

interface Character {
  id: number;
  name: string;
  class: string;
  userId?: string | null;
}

function MemberChip({
  member,
  characters,
  isMe,
}: {
  member: DungeonGroupMember;
  characters: Character[];
  isMe: boolean;
}) {
  const char = characters.find((c) => c.userId === member.userId);
  const name = char?.name ?? '?';

  let classColor = 'var(--mantine-color-gray-5)';
  if (char?.class) {
    const key = normalizeClass(char.class);
    const cc = classColors[key as keyof typeof classColors];
    if (cc) classColor = cc;
  }

  return (
    <Group
      gap={4}
      wrap="nowrap"
      px={5}
      py={2}
      style={{
        borderRadius: 4,
        backgroundColor: isMe ? 'rgba(64, 192, 87, 0.12)' : 'var(--mantine-color-dark-6)',
        border: isMe ? '1px solid var(--mantine-color-green-8)' : undefined,
      }}
    >
      {char?.class && (
        <img
          src={`/src/character/class/${normalizeClass(char.class)}-icon.svg`}
          alt={char.class}
          style={{ width: 12, height: 12, flexShrink: 0 }}
        />
      )}
      <Text size="xs" fw={isMe ? 700 : 500} lineClamp={1} style={{ color: classColor }}>
        {name}
      </Text>
    </Group>
  );
}

function EmptySlot() {
  return (
    <Box
      px={5}
      py={2}
      style={{ borderRadius: 4, border: '1px dashed var(--mantine-color-dark-4)' }}
    >
      <Text size="xs" c="dimmed" fs="italic">
        —
      </Text>
    </Box>
  );
}

function GuestChip({ guest }: { guest: DungeonGroupGuest }) {
  return (
    <Badge
      variant="light"
      color="teal"
      radius="sm"
      px={5}
      py={2}
      style={{
        textTransform: 'none',
        height: 'auto',
        border: 'none',
      }}
      leftSection={
        guest.class ? (
          <img
            src={`/src/character/class/${normalizeClass(guest.class)}-icon.svg`}
            alt={String(guest.class)}
            style={{ width: 12, height: 12, display: 'block' }}
          />
        ) : (
          <IconUserPlus size={11} style={{ display: 'block' }} />
        )
      }
    >
      <Text size="xs" fw={500} lineClamp={1}>
        {guest.name}
      </Text>
    </Badge>
  );
}

/** Derive the display role from slotId (set by admin in composer), fallback to role field */
function getGuestDisplayRole(guest: DungeonGroupGuest): 'TANK' | 'HEALER' | 'DPS' {
  const slotId = guest.slotId;
  if (slotId) {
    if (slotId.startsWith('slot-TANK')) return 'TANK';
    if (slotId.startsWith('slot-HEALER')) return 'HEALER';
    if (slotId.startsWith('slot-DPS')) return 'DPS';
  }
  return guest.role;
}

const ROLE_META = {
  TANK: { icon: <IconShield size={11} />, label: 'Tank', color: 'var(--mantine-color-blue-4)' },
  HEALER: { icon: <IconHeart size={11} />, label: 'Heal', color: 'var(--mantine-color-green-4)' },
  DPS: { icon: <IconSword size={11} />, label: 'DPS', color: 'var(--mantine-color-orange-4)' },
};

function RoleRow({
  role,
  members,
  guests,
  characters,
  userId,
}: {
  role: 'TANK' | 'HEALER' | 'DPS';
  members: DungeonGroupMember[];
  guests: DungeonGroupGuest[];
  characters: Character[];
  userId: string | number | null | undefined;
}) {
  const meta = ROLE_META[role];
  const isEmpty = members.length === 0 && guests.length === 0;

  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <Group gap={3} style={{ minWidth: 48, paddingTop: 2 }}>
        <span style={{ color: meta.color, display: 'flex', alignItems: 'center' }}>
          {meta.icon}
        </span>
        <Text size="xs" fw={700} style={{ color: meta.color }}>
          {meta.label}
        </Text>
      </Group>
      <Group gap={3} wrap="wrap" style={{ flex: 1 }}>
        {isEmpty ? (
          <EmptySlot />
        ) : (
          <>
            {members.map((m) => (
              <MemberChip
                key={m.userId}
                member={m}
                characters={characters}
                isMe={String(m.userId) === String(userId)}
              />
            ))}
            {guests.map((g) => (
              <GuestChip key={g.id} guest={g} />
            ))}
          </>
        )}
      </Group>
    </Group>
  );
}

interface ActivityDungeonGroupsSectionProps {
  groups: DungeonGroup[];
  characters: Character[];
  userId: string | number | null | undefined;
}

export function ActivityDungeonGroupsSection({
  groups,
  characters,
  userId,
}: ActivityDungeonGroupsSectionProps) {
  const { t } = useTranslation('myActivity');
  const navigate = useNavigate();
  const { guild, extension } = useRouteParams();

  return (
    <ActivitySection
      icon={<IconUsers size={20} />}
      color="orange"
      title={t('dungeons.title')}
      description={t('dungeons.description')}
    >
      {groups.length === 0 ? (
        <ActivityEmptyState
          icon={<IconUsers size={26} stroke={1.5} />}
          title={t('dungeons.empty_title')}
          text={t('dungeons.empty_text')}
          action={
            <Button
              variant="light"
              color="orange"
              size="xs"
              onClick={() => navigate(`/${guild}/${extension}/dungeons`)}
            >
              {t('dungeons.see_dungeons')}
            </Button>
          }
        />
      ) : (
        <DungeonGroupList groups={groups} characters={characters} userId={userId} />
      )}
    </ActivitySection>
  );
}

function DungeonGroupList({ groups, characters, userId }: ActivityDungeonGroupsSectionProps) {
  return (
    <Stack gap="sm">
      {groups.map((group) => {
        const isConfirmed = group.status === 'CONFIRMED';
        const tanks = group.members.filter((m) => m.role === 'TANK');
        const healers = group.members.filter((m) => m.role === 'HEALER');
        const dps = group.members.filter((m) => m.role === 'DPS');

        return (
          <Paper
            key={group.id}
            withBorder
            radius="sm"
            p={0}
            style={{
              overflow: 'hidden',
              borderColor: isConfirmed
                ? 'var(--mantine-color-green-8)'
                : 'var(--mantine-color-dark-4)',
            }}
          >
            <Box
              style={{
                height: 2,
                backgroundColor: isConfirmed
                  ? 'var(--mantine-color-green-6)'
                  : 'var(--mantine-color-dark-5)',
              }}
            />
            <Stack gap={6} p="xs">
              <Group justify="space-between" wrap="nowrap">
                <Group gap={6}>
                  <Text size="xs" fw={700} c={group.type === 'M+' ? 'orange.4' : 'blue.4'}>
                    {group.type}
                  </Text>
                  <Text size="sm" fw={600}>
                    {dayjs(group.date).format('ddd D MMM')}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {group.startTime.slice(0, 5)} → {group.endTime.slice(0, 5)}
                </Text>
              </Group>

              <Stack gap={4}>
                <RoleRow
                  role="TANK"
                  members={tanks}
                  guests={(group.guests ?? []).filter((g) => getGuestDisplayRole(g) === 'TANK')}
                  characters={characters}
                  userId={userId}
                />
                <RoleRow
                  role="HEALER"
                  members={healers}
                  guests={(group.guests ?? []).filter((g) => getGuestDisplayRole(g) === 'HEALER')}
                  characters={characters}
                  userId={userId}
                />
                <RoleRow
                  role="DPS"
                  members={dps}
                  guests={(group.guests ?? []).filter((g) => getGuestDisplayRole(g) === 'DPS')}
                  characters={characters}
                  userId={userId}
                />
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
