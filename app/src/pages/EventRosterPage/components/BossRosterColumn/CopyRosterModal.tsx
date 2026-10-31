import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';

interface CopyRosterModalProps {
  opened: boolean;
  onClose: () => void;
  sourceBossId: number;
  sourceBossName: string;
  allBosses: { id: number; name: string }[];
  onCopy: (targetBossIds: number[]) => void;
  isPending: boolean;
}

export const CopyRosterModal = ({
  opened,
  onClose,
  sourceBossId,
  sourceBossName,
  allBosses,
  onCopy,
  isPending,
}: CopyRosterModalProps) => {
  const [selectedBossIds, setSelectedBossIds] = useState<number[]>([]);
  const targetBosses = allBosses.filter((b) => b.id !== sourceBossId);

  const handleCopy = () => {
    onCopy(selectedBossIds);
    onClose();
    setSelectedBossIds([]);
  };

  const toggleAll = () => {
    if (selectedBossIds.length === targetBosses.length) {
      setSelectedBossIds([]);
    } else {
      setSelectedBossIds(targetBosses.map((b) => b.id));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Copy Roster from ${sourceBossName}`} centered>
      <Stack>
        <Text size="sm" c="dimmed">
          Select bosses to copy this roster configuration to. Existing assignments on target bosses
          will be kept unless they conflict with the simplified assignments.
        </Text>

        <Group justify="space-between" mb="xs">
          <Text fw={500}>Target Bosses</Text>
          <Button variant="subtle" size="xs" onClick={toggleAll}>
            {selectedBossIds.length === targetBosses.length ? 'Deselect All' : 'Select All'}
          </Button>
        </Group>

        <Stack gap="xs" mah={300} style={{ overflowY: 'auto' }}>
          {targetBosses.map((boss) => (
            <Checkbox
              key={boss.id}
              label={boss.name}
              checked={selectedBossIds.includes(boss.id)}
              onChange={(event) => {
                if (event.currentTarget.checked) {
                  setSelectedBossIds([...selectedBossIds, boss.id]);
                } else {
                  setSelectedBossIds(selectedBossIds.filter((id) => id !== boss.id));
                }
              }}
            />
          ))}
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCopy} loading={isPending} disabled={selectedBossIds.length === 0}>
            Copy Roster
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
