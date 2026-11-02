import { Button, Center, Image, Stack, Text, Title } from '@mantine/core';
import { isValidExtension } from 'config/seasonConfig';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useParams } from 'react-router-dom';

const RequireExtension: React.FC = () => {
  const { extension } = useParams();
  const { t } = useTranslation('common');

  if (!isValidExtension(extension)) {
    return (
      <Center h="100vh" w="100%">
        <Stack align="center" gap="md">
          <Image src="/src/murloc-pajama.png" alt="Extension not found" w={500} h="auto" mb="md" />
          <Title order={1}>404</Title>
          <Title order={3}>{t('error.extension_not_found.title')}</Title>
          <Text c="dimmed" ta="center">
            {t('error.extension_not_found.description', { extension })}
          </Text>
          <Button onClick={() => (window.location.href = '/login')} variant="filled">
            {t('error.extension_not_found.go_home')}
          </Button>
        </Stack>
      </Center>
    );
  }

  return <Outlet />;
};

export default RequireExtension;
