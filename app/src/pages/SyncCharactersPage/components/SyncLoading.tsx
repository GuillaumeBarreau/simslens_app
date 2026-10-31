import { Center, Container, Loader, Stack, Text, Title } from '@mantine/core';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

export const SyncLoading: React.FC = () => {
  const { t } = useTranslation('sync');

  return (
    <Container size="sm" py="xl">
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="xl" type="dots" />
          <Title order={3}>{t('loading.title')}</Title>
          <Text c="dimmed" size="sm" ta="center">
            <Trans i18nKey="loading.message" ns="sync">
              We are verifying guild membership for all your characters.
              <br />
              This ensures accurate linking and may take a few seconds.
            </Trans>
          </Text>
        </Stack>
      </Center>
    </Container>
  );
};
