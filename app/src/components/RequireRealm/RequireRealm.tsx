import { Button, Center, Flex, Group, Image, Loader, Stack, Text, Title } from '@mantine/core';
import { IconLogout, IconUsers } from '@tabler/icons-react';
import { useAuth } from 'contexts';
import { RealmAccessProvider, type RealmRole } from 'contexts/RealmAccessContext';
import { useMyRealmPermissions, useUserRealm } from 'hooks/queries';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getErrorStatus } from 'services/api.client';

import { isSameGuild, pathInGuild, realmHomePath } from './realmPath';

const FullPageLoader = () => (
  <Center h="100vh" w="100%">
    <Loader size="xl" />
  </Center>
);

const RealmErrorLayout = ({ children }: { children: ReactNode }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <Flex direction="column" h="100vh">
      <Flex
        bg="app.8"
        px="md"
        py="xs"
        justify="flex-end"
        align="center"
        gap="xs"
        style={{ borderBottom: '1px solid #2f2f2f', flexShrink: 0 }}
      >
        <Button
          variant="subtle"
          color="app.1"
          leftSection={<IconUsers size={16} />}
          onClick={() => navigate('/sync')}
        >
          {t('common:navigation.sync_characters')}
        </Button>
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconLogout size={16} />}
          onClick={logout}
        >
          {t('common:navigation.logout')}
        </Button>
      </Flex>
      <Center style={{ flex: 1 }}>{children}</Center>
    </Flex>
  );
};

const RequireRealm = () => {
  const { user, refetchUser, isLoading: isAuthLoading } = useAuth();
  const { guild } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const realmQuery = useUserRealm(user?.id ? String(user.id) : null, { enabled: !!user });
  const realm = realmQuery.data ?? null;
  const isOwnGuild = !!realm && !!guild && isSameGuild(guild, realm.guildName);
  const permQuery = useMyRealmPermissions(realm?.id, isOwnGuild);

  const sessionExpired =
    getErrorStatus(realmQuery.error) === 401 || getErrorStatus(permQuery.error) === 401;
  const sessionCheckStarted = useRef(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (!sessionExpired || sessionCheckStarted.current) return;
    sessionCheckStarted.current = true;
    void refetchUser().finally(() => setSessionChecked(true));
  }, [sessionExpired, refetchUser]);

  if (!user && !isAuthLoading) {
    return <Navigate to="/login" replace />;
  }

  if (
    isAuthLoading ||
    realmQuery.isLoading ||
    (isOwnGuild && permQuery.isLoading) ||
    (sessionExpired && !sessionChecked)
  ) {
    return <FullPageLoader />;
  }

  const goHome = () => navigate(realm ? realmHomePath(realm.guildName, realm.game) : '/redirect');

  const loadError = (onRetry: () => unknown) => (
    <RealmErrorLayout>
      <Stack align="center" gap="md">
        <Text>{t('error.realm_load_error.message')}</Text>
        <Group>
          <Button onClick={() => onRetry()} variant="filled">
            {t('error.realm_load_error.retry')}
          </Button>
          <Button onClick={goHome} variant="default">
            {t('error.realm_load_error.go_home')}
          </Button>
        </Group>
      </Stack>
    </RealmErrorLayout>
  );

  if (realmQuery.isError) {
    return loadError(realmQuery.refetch);
  }

  if (!realm) {
    return (
      <RealmErrorLayout>
        <Stack align="center" gap="md">
          <Image src="/src/no-character.png" alt="" w={500} h="auto" mb="md" />
          <Title order={1}>404</Title>
          <Title order={3}>{t('error.realm_not_found.title')}</Title>
          <Text c="dimmed" ta="center">
            {t('error.realm_not_found.description')}
          </Text>
        </Stack>
      </RealmErrorLayout>
    );
  }

  if (!isOwnGuild) {
    return <Navigate to={pathInGuild(location, realm.guildName, realm.game)} replace />;
  }

  if (permQuery.isError || !permQuery.data) {
    return loadError(permQuery.refetch);
  }

  return (
    <RealmAccessProvider
      role={permQuery.data.role as RealmRole}
      permissions={permQuery.data.permissions}
    >
      <Outlet />
    </RealmAccessProvider>
  );
};

export default RequireRealm;
