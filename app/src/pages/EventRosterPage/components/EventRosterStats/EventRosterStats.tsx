import { Group, Paper, Stack, Text, Title } from '@mantine/core';

interface EventRosterStatsProps {
  tankCount: number;
  healerCount: number;
  meleeCount: number;
  rangedCount: number;
}

export const EventRosterStats = ({
  tankCount,
  healerCount,
  meleeCount,
  rangedCount,
}: EventRosterStatsProps) => {
  return (
    <Group grow>
      <Paper p="md" withBorder>
        <Stack gap="xs" align="center">
          <Title order={4}>TANKS</Title>
          <Text size="xl" fw={700}>
            {tankCount}
          </Text>
        </Stack>
      </Paper>
      <Paper p="md" withBorder>
        <Stack gap="xs" align="center">
          <Title order={4}>HEALERS</Title>
          <Text size="xl" fw={700}>
            {healerCount}
          </Text>
        </Stack>
      </Paper>
      <Paper p="md" withBorder>
        <Stack gap="xs" align="center">
          <Title order={4}>MELEE</Title>
          <Text size="xl" fw={700}>
            {meleeCount}
          </Text>
        </Stack>
      </Paper>
      <Paper p="md" withBorder>
        <Stack gap="xs" align="center">
          <Title order={4}>RANGED</Title>
          <Text size="xl" fw={700}>
            {rangedCount}
          </Text>
        </Stack>
      </Paper>
    </Group>
  );
};
