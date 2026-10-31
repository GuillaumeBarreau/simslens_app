import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconDownload, IconX } from '@tabler/icons-react';
import {
  useCharacterTalents,
  useImportTalents,
  useSaveTalents,
  useTalentTree,
} from 'hooks/queries';
import { useEffect, useState } from 'react';
import type { SelectedNodes, TalentNode } from 'types/talent.types';

import { nextSelection } from './talentLayout';
import { TalentTree } from './TalentTree';

const DRAWER_WIDTH = { base: '100%', md: '92vw', lg: '90vw', xl: 1500 };

interface TalentTreeDrawerProps {
  characterId: number;
  specializationId: number;
  specName?: string;
  readOnly?: boolean;
  onClose: () => void;
}

export function TalentTreeDrawer({
  characterId,
  specializationId,
  specName,
  readOnly = false,
  onClose,
}: TalentTreeDrawerProps) {
  const { data: tree, isLoading: treeLoading } = useTalentTree(characterId, specializationId);
  const { data: loadout, isLoading: loadoutLoading } = useCharacterTalents(
    characterId,
    specializationId,
  );
  const saveTalents = useSaveTalents();
  const importTalents = useImportTalents();

  const [selected, setSelected] = useState<SelectedNodes>({});
  const [dirty, setDirty] = useState(false);

  // (Ré)initialise la sélection quand le loadout chargé change (nouveau perso/spé).
  // La query est indexée par (characterId, specializationId), donc `loadout`
  // change bien à chaque changement de spé.
  useEffect(() => {
    setSelected(loadout?.selectedNodes ?? {});
    setDirty(false);
  }, [loadout]);

  const handleNodeClick = (node: TalentNode) => {
    setSelected((prev) => {
      const next = { ...prev };
      const value = nextSelection(node, prev[node.blizzardNodeId]);
      if (value === undefined) delete next[node.blizzardNodeId];
      else next[node.blizzardNodeId] = value;
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await saveTalents.mutateAsync({ characterId, specializationId, selectedNodes: selected });
      setDirty(false);
      notifications.show({ message: 'Talents enregistrés', color: 'green' });
    } catch {
      notifications.show({ message: "Échec de l'enregistrement", color: 'red' });
    }
  };

  const handleImport = async () => {
    try {
      const result = await importTalents.mutateAsync({ characterId, specializationId });
      setSelected(result.selectedNodes);
      setDirty(false);
      notifications.show({ message: 'Talents importés depuis Blizzard', color: 'green' });
    } catch {
      notifications.show({ message: "Échec de l'import Blizzard", color: 'red' });
    }
  };

  const loading = treeLoading || loadoutLoading;

  return (
    <Box
      w={DRAWER_WIDTH}
      bg="app.7"
      style={{
        zIndex: 1100,
        borderLeft: '1px solid var(--mantine-color-dark-4)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        top: 0,
        right: 0,
      }}
    >
      <Stack gap="md" h="100%" p="md">
        <Group justify="space-between" pt="md">
          <Title order={4}>Talents{specName ? ` · ${specName}` : ''}</Title>
          <ActionIcon variant="subtle" onClick={onClose} size="lg">
            <IconX size={24} />
          </ActionIcon>
        </Group>

        {!readOnly && (
          <Group>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={handleImport}
              loading={importTalents.isPending}
            >
              Importer mes talents
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              loading={saveTalents.isPending}
              disabled={!dirty}
            >
              Enregistrer
            </Button>
          </Group>
        )}

        {loading ? (
          <Center py="xl" style={{ flex: 1 }}>
            <Loader />
          </Center>
        ) : tree ? (
          <ScrollArea flex={1} style={{ minHeight: 0 }}>
            <TalentTree
              tree={tree}
              selected={selected}
              specName={specName}
              readOnly={readOnly}
              onNodeClick={handleNodeClick}
            />
          </ScrollArea>
        ) : (
          <Center py="xl" style={{ flex: 1 }}>
            <Text size="sm" c="dimmed">
              Aucun arbre de talents disponible pour cette spécialisation.
            </Text>
          </Center>
        )}
      </Stack>
    </Box>
  );
}
