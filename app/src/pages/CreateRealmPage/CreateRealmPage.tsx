import {
  Alert,
  Button,
  Center,
  Container,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from 'contexts';
import { useRegions } from 'hooks/queries';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createRealm } from 'services/api';

interface Server {
  id: number;
  name: string;
  slug: string;
}

interface Region {
  id: number;
  name: string;
  servers: Server[];
}

const CreateRealmPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('createRealm');
  const { data } = useRegions();
  const regions = useMemo(() => (data as Region[]) || [], [data]);
  const [serverOptions, setServerOptions] = useState<{ value: string; label: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createRealmMutation = useMutation({
    mutationFn: createRealm,
    onSuccess: () => {
      setErrorMessage(null);
      notifications.show({
        title: t('notifications.success_title'),
        message: t('notifications.success_message'),
        color: 'green',
        autoClose: 5000,
      });
      navigate('/sync');
    },
    onError: (error: any) => {
      const message =
        error?.message ||
        error?.error ||
        error?.response?.data?.message ||
        t('notifications.error_message') ||
        'Failed to create realm';
      setErrorMessage(message);
      notifications.show({
        title: t('notifications.error_title'),
        message: message,
        color: 'red',
      });
    },
  });

  const form = useForm({
    initialValues: {
      guildName: '',
      server: '',
      region: '',
    },
    validate: {
      guildName: (value) => (value.length < 2 ? t('validation.guild_name_short') : null),
      server: (value) => (!value ? t('validation.error_message') : null),
      region: (value) => (!value ? t('validation.error_message') : null),
    },
  });

  useEffect(() => {
    const selectedRegion = regions.find((r) => r.name === form.values.region);
    if (selectedRegion) {
      const opts = selectedRegion.servers.map((s) => ({ value: s.slug, label: s.name }));
      setServerOptions(opts);
    } else {
      setServerOptions([]);
    }
  }, [form.values.region, regions]);

  const handleSubmit = (values: typeof form.values) => {
    console.log('Attempting to create realm with values:', values);
    if (!user) {
      console.error('User is missing in CreateRealmPage');
      notifications.show({
        title: t('notifications.error_title'),
        message: t('notifications.session_missing'),
        color: 'red',
      });
      return;
    }

    createRealmMutation.mutate({
      name: values.guildName,
      server: values.server,
      region: values.region,
      ownerId: user.id,
    });
  };

  return (
    <Center h="100vh" w="100%">
      <Container size={420} my={40}>
        <Title ta="center">{t('title')}</Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          {t('subtitle')}
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form
            onSubmit={form.onSubmit(handleSubmit, (errors) => {
              console.log('Form validation failed:', errors);
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
                {...form.getInputProps('region')}
              />

              <Select
                label={t('form.server')}
                placeholder={t('form.server_placeholder')}
                data={serverOptions}
                required
                searchable
                disabled={!form.values.region}
                {...form.getInputProps('server')}
              />

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
            title="Error"
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
