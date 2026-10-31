import {
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck, IconSearch, IconUserPlus } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface AvailableCharactersListProps {
  characters: any[];
  realm: any;
  onLink: (character: any) => void;
  isLinking: boolean;
}

export const AvailableCharactersList: React.FC<AvailableCharactersListProps> = ({
  characters,
  realm,
  onLink,
  isLinking,
}) => {
  const { t } = useTranslation('sync');
  const [searchQuery, setSearchQuery] = React.useState('');

  if (characters.length === 0) return null;

  const filteredCharacters = characters.filter((char: any) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = char.name.toLowerCase().includes(query);
    const guildMatch = char.guildName?.toLowerCase().includes(query) || false;

    return nameMatch || guildMatch;
  });

  const isGuildMatched = (char: any) => {
    return (
      (realm?.guildName && char.guildName?.toLowerCase() === realm.guildName.toLowerCase()) ||
      char.matchRealm
    );
  };

  const getClassSlug = (className: string) => {
    return className.toLowerCase().replace(/\s+/g, '_');
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Title order={4}>{t('available_list.title')}</Title>
        <TextInput
          placeholder={t('available_list.search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          w={250}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {filteredCharacters.map((char: any) => {
          const guildMatched = isGuildMatched(char);
          const classSlug = getClassSlug(char.playable_class.name);

          return (
            <Card
              key={`${char.name}-${char.realm.slug}`}
              shadow="sm"
              padding="sm"
              radius="md"
              withBorder
              style={{
                borderColor: guildMatched
                  ? 'var(--mantine-color-brand-5)'
                  : 'var(--mantine-color-dark-4)',
                backgroundColor: 'var(--mantine-color-app-6)',
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm" truncate className={`class-${classSlug}`}>
                    {char.name}
                  </Text>
                  <Badge color="dark" variant="light" size="xs">
                    {char.realm.name}
                  </Badge>
                </Group>

                <Group gap="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    Lvl {char.level}
                  </Text>
                  <Text size="xs" c="dimmed">
                    •
                  </Text>
                  <Text size="xs" truncate className={`class-${classSlug}`}>
                    {char.playable_class.name}
                  </Text>
                </Group>

                {char.guildName && (
                  <Badge
                    color={guildMatched ? 'brand.5' : 'gray'}
                    variant="light"
                    size="xs"
                    leftSection={guildMatched ? <IconCheck size={12} /> : undefined}
                  >
                    {char.guildName}
                  </Badge>
                )}

                <Button
                  fullWidth
                  size="xs"
                  variant={guildMatched ? 'filled' : 'light'}
                  color={guildMatched ? 'brand.5' : 'gray'}
                  leftSection={<IconUserPlus size={14} />}
                  onClick={() => onLink(char)}
                  loading={isLinking}
                >
                  {char.guildName
                    ? t('available_list.link_to_guild', { guild: char.guildName })
                    : t('available_list.link_character')}
                </Button>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      {filteredCharacters.length === 0 && searchQuery && (
        <Text c="dimmed" ta="center" py="xl">
          Aucun personnage trouvé pour "{searchQuery}"
        </Text>
      )}
    </Stack>
  );
};
