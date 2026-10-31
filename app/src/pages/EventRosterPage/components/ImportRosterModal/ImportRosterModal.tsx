import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  Radio,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { PastRosterEvent } from 'services/roster.service';
import { normalizeClass } from 'utils';
import { useState } from 'react';

interface ImportRosterModalProps {
  opened: boolean;
  onClose: () => void;
  pastRosters: PastRosterEvent[];
  isLoading: boolean;
  isImporting: boolean;
  onImport: (sourceEventId: number) => void;
}

const ROLE_COLORS: Record<string, string> = {
  tanks: 'blue',
  healers: 'green',
  melee: 'red',
  ranged: 'orange',
};

export const ImportRosterModal = ({
  opened,
  onClose,
  pastRosters,
  isLoading,
  isImporting,
  onImport,
}: ImportRosterModalProps) => {
  const { t } = useTranslation('eventRoster');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const selectedEvent = pastRosters.find((e) => e.id === selectedEventId) ?? null;

  const handleImport = () => {
    if (selectedEventId !== null) {
      onImport(selectedEventId);
      onClose();
      setSelectedEventId(null);
    }
  };

  const handleClose = () => {
    setSelectedEventId(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('import.title')}
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('import.description')}
        </Text>

        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : pastRosters.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            {t('import.noHistory')}
          </Text>
        ) : (
          <Group align="flex-start" gap="md" wrap="nowrap">
            {/* Left: event list */}
            <ScrollArea h={320} style={{ flex: 1, minWidth: 0 }}>
              <Stack gap="xs">
                {pastRosters.map((event) => (
                  <Box
                    key={event.id}
                    p="xs"
                    style={(theme) => ({
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      border: `1px solid ${
                        selectedEventId === event.id
                          ? theme.colors.brand[5]
                          : theme.colors.dark[4]
                      }`,
                      backgroundColor:
                        selectedEventId === event.id
                          ? theme.colors.dark[6]
                          : 'transparent',
                    })}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <Radio
                          checked={selectedEventId === event.id}
                          onChange={() => setSelectedEventId(event.id)}
                          size="xs"
                        />
                        <Stack gap={2}>
                          <Text size="sm" fw={500} lineClamp={1}>
                            {event.title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {new Date(event.startTime).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </Stack>
                      </Group>
                      <Badge size="xs" variant="light" color="gray">
                        <Group gap={4} wrap="nowrap">
                          <IconUsers size={10} />
                          {event.roster.counts.total}
                        </Group>
                      </Badge>
                    </Group>
                  </Box>
                ))}
              </Stack>
            </ScrollArea>

            <Divider orientation="vertical" />

            {/* Right: roster preview */}
            <Box style={{ flex: 1, minWidth: 0 }}>
              {selectedEvent ? (
                <ScrollArea h={320}>
                  <Stack gap="xs">
                    {(['tanks', 'healers', 'melee', 'ranged'] as const).map((role) => {
                      const chars = selectedEvent.roster[role];
                      if (chars.length === 0) return null;
                      return (
                        <Box key={role}>
                          <Badge size="xs" color={ROLE_COLORS[role]} mb={4}>
                            {t(`import.role_${role}`, { count: chars.length })}
                          </Badge>
                          <Stack gap={2}>
                            {chars.map((char) => (
                              <Text
                                key={char.id}
                                size="xs"
                                c={`wow-${normalizeClass(char.class)}.4`}
                              >
                                {char.name}
                              </Text>
                            ))}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </ScrollArea>
              ) : (
                <Group justify="center" align="center" h={320}>
                  <Text size="sm" c="dimmed">
                    {t('import.selectEvent')}
                  </Text>
                </Group>
              )}
            </Box>
          </Group>
        )}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={handleClose}>
            {t('import.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            loading={isImporting}
            disabled={selectedEventId === null}
          >
            {t('import.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ImportRosterModal;
