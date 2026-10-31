import { Box, Button, CloseButton, Flex, Group, Title } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LootDrawer } from '../LootDrawer/LootDrawer';
import { RaidChooser } from '../RaidChooser';
import type { Raid } from '../types';

interface InstancePanelProps {
  onClose: () => void;
}

const InstancePanel = ({ onClose }: InstancePanelProps) => {
  const { t } = useTranslation('droptimizer');
  const [selectedRaid, setSelectedRaid] = useState<Raid | null>(null);
  return (
    <Flex
      direction="column"
      p="lg"
      gap="md"
      h="100%"
      style={{ borderLeft: '1px solid var(--mantine-color-dark-4)' }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Title order={4}>{t('instance_panel.title')}</Title>
        <CloseButton onClick={onClose} aria-label={t('instance_panel.close')} />
      </Group>
      {!selectedRaid ? (
        <RaidChooser onSelect={(r) => setSelectedRaid(r)} />
      ) : (
        <Flex direction="column" gap="sm" flex={1} style={{ overflow: 'hidden' }}>
          <Flex justify="space-between" align="center" style={{ flexShrink: 0 }}>
            <div>
              <strong>{selectedRaid.name}</strong>
              {selectedRaid.difficulty && (
                <div style={{ fontSize: 12, color: 'var(--mantine-color-app-3)' }}>
                  {selectedRaid.difficulty}
                </div>
              )}
            </div>
            <Button size="xs" variant="default" onClick={() => setSelectedRaid(null)}>
              {t('instance_panel.change')}
            </Button>
          </Flex>
          <Box flex={1} style={{ overflow: 'hidden' }}>
            <LootDrawer instanceId={Number(selectedRaid.id)} />
          </Box>
        </Flex>
      )}
    </Flex>
  );
};

export { InstancePanel };
