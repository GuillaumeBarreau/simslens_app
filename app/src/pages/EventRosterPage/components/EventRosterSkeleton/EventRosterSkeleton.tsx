import { Container, Grid, Group, Skeleton, Stack } from '@mantine/core';

const EventRosterSkeleton = () => {
  return (
    <Container size="xxl" py="xl">
      <Stack gap="lg">
        <Group>
          <Skeleton width={80} height={36} radius="md" />
          <Stack gap={4}>
            <Skeleton width={200} height={28} />
            <Skeleton width={150} height={16} />
          </Stack>
        </Group>
        <Skeleton height={60} radius="md" />
        <Grid>
          <Grid.Col span={{ base: 12, md: 9 }}>
            <Stack gap="md">
              <Group grow>
                <Skeleton height={80} radius="md" />
                <Skeleton height={80} radius="md" />
                <Skeleton height={80} radius="md" />
              </Group>
              <Grid>
                <Grid.Col span={4}>
                  <Skeleton height={400} radius="md" />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Skeleton height={400} radius="md" />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Skeleton height={400} radius="md" />
                </Grid.Col>
              </Grid>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Skeleton height={500} radius="md" />
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};

export default EventRosterSkeleton;
