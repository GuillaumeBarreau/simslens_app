import { Button, Center, Image, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const NoGuildAlert: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('sync');

  return (
    <Center py="xl" mt="xl">
      <Stack align="center" gap="xl">
        <Image src="/src/404-character.png" h={280} w="auto" fit="contain" alt="No Guild Found" />
        <Title order={3}>{t('alert.no_guild_title')}</Title>
        <Text c="dimmed" maw={500} ta="center">
          {t('alert.no_guild_message_1')}
          <br />
          {t('alert.no_guild_message_2')}
        </Text>
        <Button
          size="md"
          variant="gradient"
          gradient={{ from: 'brand.5', to: 'brand.6' }}
          rightSection={<IconArrowRight size={18} />}
          onClick={() => navigate('/create-realm')}
          color="brand.5"
        >
          {t('alert.create_realm_btn')}
        </Button>
      </Stack>
    </Center>
  );
};
