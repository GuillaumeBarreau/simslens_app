import { Badge, Button, Card, Divider, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { WOW_EXTENSION } from '../../../config/seasonConfig';

interface LinkedRealmsListProps {
  linkedChars: any[];
}

export const LinkedRealmsList: React.FC<LinkedRealmsListProps> = ({ linkedChars }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('sync');

  if (linkedChars.length === 0) return null;

  const groupedData = Object.values(
    linkedChars.reduce((acc: any, char: any) => {
      const guildName = char.guildName || t('linked_list.unknown_guild');
      if (!acc[guildName]) {
        acc[guildName] = {
          guildName: char.guildName,
          realmName: char.realm.name,
          characters: [],
        };
      }
      acc[guildName].characters.push(char);
      return acc;
    }, {}),
  );

  return (
    <Stack gap="md">
      <Title order={4}>{t('linked_list.title')}</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {groupedData.map((group: any) => (
          <Card
            key={`guild-${group.guildName}`}
            shadow="sm"
            padding="sm"
            radius="md"
            withBorder
            style={{
              cursor: 'pointer',
              borderColor: 'var(--mantine-color-brand-5)',
              backgroundColor: 'var(--mantine-color-app-6)',
            }}
            onClick={() =>
              group.guildName && navigate(`/${group.guildName}/${WOW_EXTENSION}/roster`)
            }
          >
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <Text fw={700} size="md" c="brand.6" truncate>
                  {group.guildName || t('linked_list.unknown_guild')}
                </Text>
                <Badge color="brand.5" variant="light" size="xs">
                  {group.realmName}
                </Badge>
              </Group>

              <Divider label={t('linked_list.divider_label')} labelPosition="center" size="xs" />

              <Stack gap={2}>
                {group.characters.map((char: any) => (
                  <Group key={char.id} justify="space-between" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                      <Text
                        size="xs"
                        truncate
                        className={`class-${char.playable_class.name.toLowerCase().replace(/\s+/g, '_')}`}
                      >
                        {char.name}
                      </Text>
                      <Badge color="dark" variant="light" size="xs">
                        {char.realm.name}
                      </Badge>
                      {char.status === 'pending' && (
                        <Badge color="orange" variant="filled" size="xs">
                          {t('linked_list.status_pending')}
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {char.level}
                    </Text>
                  </Group>
                ))}
              </Stack>

              <Button
                fullWidth
                size="xs"
                variant="filled"
                color="brand.5"
                rightSection={<IconArrowRight size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (group.guildName) {
                    navigate(`/${group.guildName}/${WOW_EXTENSION}/roster`);
                  }
                }}
                disabled={!group.guildName}
              >
                {group.guildName
                  ? t('linked_list.go_to_guild', { guild: group.guildName })
                  : t('linked_list.unknown_guild')}
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
};
