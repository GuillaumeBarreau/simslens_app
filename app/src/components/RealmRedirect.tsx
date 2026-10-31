import {
  Button,
  Card,
  Center,
  Container,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconShield, IconSquarePlus, IconUsers } from '@tabler/icons-react';
import { WOW_EXTENSION } from 'config/seasonConfig';
import { useAuth } from 'contexts';
import { useUserRealm } from 'hooks/queries';
import React from 'react';
import { Link, Navigate } from 'react-router-dom';

const RealmRedirect: React.FC = () => {
  const { user, isLoading: isAuthLoading, lastVisitedRealm } = useAuth();

  const { data: realm, isLoading: isRealmLoading } = useUserRealm(
    user?.id ? String(user.id) : null,
    {
      enabled: !!user,
    },
  );

  if (isAuthLoading || (!!user && isRealmLoading)) {
    return (
      <Center>
        <Loader size="xl" />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const currentExtension =
    pathParts[1] && pathParts[1] !== 'redirect' ? pathParts[1] : WOW_EXTENSION;

  if (lastVisitedRealm) {
    return (
      <Navigate
        to={`/${lastVisitedRealm.guildName}/${lastVisitedRealm.extension}/my-activity`}
        replace
      />
    );
  }

  if (realm) {
    const hasLinkedCharacters = user.linkedCharacters && user.linkedCharacters.length > 0;

    if (!hasLinkedCharacters) {
      return <Navigate to="/sync" replace />;
    }

    return <Navigate to={`/${realm.guildName}/${currentExtension}/my-activity`} replace />;
  }

  if (user.linkedCharacters && user.linkedCharacters.length > 0) {
    const firstChar = user.linkedCharacters.find((c: { guildName?: string }) => c.guildName);
    if (firstChar) {
      return <Navigate to={`/${firstChar.guildName}/${currentExtension}/my-activity`} replace />;
    }
  }

  if (user.guestRealms && user.guestRealms.length > 0) {
    const firstGuest = user.guestRealms[0];
    return <Navigate to={`/${firstGuest.guildName}/${currentExtension}/my-activity`} replace />;
  }

  return (
    <Container size="md" py={50}>
      <Stack gap="xl" align="center">
        <Stack align="center" gap="xs">
          <Title order={1}>Welcome to Droptimizer</Title>
          <Text size="lg" c="dimmed">
            Get started by joining an existing guild or creating a new one.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" w="100%">
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <ThemeIcon size={60} radius="md" variant="light" color="blue">
                <IconUsers size={32} />
              </ThemeIcon>
              <Title order={3}>Join a Guild</Title>
              <Text ta="center" c="dimmed" size="sm" h={50}>
                Already a member? Link your character to join your guild&apos;s realm.
              </Text>
              <Button fullWidth component={Link} to="/sync" variant="default" size="md">
                Find & Join Guild
              </Button>
            </Stack>
          </Card>

          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <ThemeIcon size={60} radius="md" variant="light" color="grape">
                <IconSquarePlus size={32} />
              </ThemeIcon>
              <Title order={3}>Create a Guild</Title>
              <Text ta="center" c="dimmed" size="sm" h={50}>
                Setting up for your team? Create a new realm to manage loot and roster.
              </Text>
              <Button
                fullWidth
                component={Link}
                to="/create-realm"
                variant="filled"
                color="grape"
                size="md"
              >
                Create New Realm
              </Button>
            </Stack>
          </Card>

          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <ThemeIcon size={60} radius="md" variant="light" color="teal">
                <IconShield size={32} />
              </ThemeIcon>
              <Title order={3}>Join as Guest</Title>
              <Text ta="center" c="dimmed" size="sm" h={50}>
                Got an invite code? Join a guild as a guest without being on the official roster.
              </Text>
              <Button
                fullWidth
                component={Link}
                to="/join-guest"
                variant="light"
                color="teal"
                size="md"
              >
                Use Invite Code
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

export default RealmRedirect;
