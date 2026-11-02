import {
  Alert,
  Button,
  Center,
  Container,
  Group,
  Paper,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { realmHomePath } from 'components/RequireRealm/realmPath';
import { isFeatureEnabled } from 'config/featureFlags';
import { useAuth } from 'contexts';
import { useCreateRealm, useRegions } from 'hooks/queries';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CreateRealmPayload } from 'services/realm.service';
import type { Realm } from 'types/realm';

import {
  createRealmErrorKey,
  FOREVER_SERVER_MODES,
  resolveCreateRealmGame,
} from './createRealm.utils';

const CreateRealmPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('createRealm');
  const [searchParams] = useSearchParams();
  const game = resolveCreateRealmGame(searchParams.get('game'), isFeatureEnabled('forever'));
  const isForever = game === 'forever';
  const { data } = useRegions(game);
  const regions = useMemo(() => data ?? [], [data]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createRealmMutation = useCreateRealm();

  const form = useForm({
    initialValues: {
      guildName: '',
      server: '',
      region: '',
    },
    validate: {
      guildName: (value) => (value.trim().length < 2 ? t('validation.guild_name_short') : null),
      server: (value) =>
        !value ? t(isForever ? 'validation.mode_required' : 'validation.error_message') : null,
      region: (value) => (!value ? t('validation.error_message') : null),
    },
  });

  const servers = useMemo(
    () => regions.find((r) => r.name === form.values.region)?.servers ?? [],
    [regions, form.values.region],
  );

  const onCreated = (realm: Realm, guildName: string) => {
    setErrorMessage(null);
    notifications.show({
      title: t('notifications.success_title'),
      message: t(
        isForever ? 'notifications.forever_success_message' : 'notifications.success_message',
      ),
      color: 'green',
      autoClose: 5000,
    });
    // Forever : pas de synchronisation Battle.net, on ouvre directement la guilde.
    navigate(isForever ? realmHomePath(realm.name || guildName, 'forever') : '/sync');
  };

  const onFailed = (error: unknown) => {
    const key = createRealmErrorKey(error);
    const fallback = (error as { message?: string } | null)?.message;
    const message = key ? t(key) : fallback || t('notifications.error_message');
    setErrorMessage(message);
    notifications.show({
      title: t('notifications.error_title'),
      message,
      color: 'red',
    });
  };

  const handleSubmit = (values: typeof form.values) => {
    if (!user) {
      notifications.show({
        title: t('notifications.error_title'),
        message: t('notifications.session_missing'),
        color: 'red',
      });
      return;
    }

    const payload: CreateRealmPayload = {
      name: values.guildName.trim(),
      server: values.server,
      region: values.region,
      ownerId: user.id,
    };
    createRealmMutation.mutate(payload, {
      onSuccess: (realm) => onCreated(realm, payload.name),
      onError: onFailed,
    });
  };

  const regionInput = form.getInputProps('region');

  return (
    <Center h="100vh" w="100%">
      <Container size={420} my={40}>
        <Title ta="center">{t(isForever ? 'forever.title' : 'title')}</Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          {t(isForever ? 'forever.subtitle' : 'subtitle')}
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form
            onSubmit={form.onSubmit(handleSubmit, () => {
              setErrorMessage(t('validation.error_message'));
              notifications.show({
                title: t('validation.error_title'),
                message: t('validation.error_message'),
                color: 'red',
              });
            })}
          >
            <Stack>
              <TextInput
                label={t('form.guild_name')}
                placeholder={t('form.guild_name_placeholder')}
                required
                {...form.getInputProps('guildName')}
              />

              <Select
                label={t('form.region')}
                placeholder={t('form.region_placeholder')}
                data={regions.map((r) => ({ value: r.name, label: r.name }))}
                required
                {...regionInput}
                onChange={(value) => {
                  regionInput.onChange(value ?? '');
                  form.setFieldValue('server', '');
                }}
              />

              {isForever ? (
                <Radio.Group
                  label={t('form.mode')}
                  description={t('form.mode_description')}
                  required
                  {...form.getInputProps('server')}
                >
                  <Group mt="xs">
                    {!servers.length && (
                      <Text size="sm" c="dimmed">
                        {t('form.mode_pick_region')}
                      </Text>
                    )}
                    {servers.map((s) => {
                      const mode = FOREVER_SERVER_MODES[s.slug];
                      return (
                        <Radio
                          key={s.slug}
                          value={s.slug}
                          label={mode ? t(`form.mode_${mode}`) : s.name}
                        />
                      );
                    })}
                  </Group>
                </Radio.Group>
              ) : (
                <Select
                  label={t('form.server')}
                  placeholder={t('form.server_placeholder')}
                  data={servers.map((s) => ({ value: s.slug, label: s.name }))}
                  required
                  searchable
                  disabled={!form.values.region}
                  {...form.getInputProps('server')}
                />
              )}

              <Button
                fullWidth
                mt="xl"
                type="submit"
                loading={createRealmMutation.isPending}
                color="brand.5"
              >
                {t('form.create_btn')}
              </Button>
            </Stack>
          </form>
        </Paper>

        {errorMessage && (
          <Alert
            color="red"
            title={t('notifications.error_title')}
            withCloseButton
            onClose={() => setErrorMessage(null)}
            mt="md"
          >
            {errorMessage}
          </Alert>
        )}
      </Container>
    </Center>
  );
};

export default CreateRealmPage;
