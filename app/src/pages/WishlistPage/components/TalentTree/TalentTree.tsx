import { Box, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import type { SelectedNodes, TalentNode, TalentTreeData } from 'types/talent.types';

import { pointsSpent } from './talentLayout';
import { TalentTreePanel } from './TalentTreePanel';

interface TalentTreeProps {
  tree: TalentTreeData;
  selected: SelectedNodes;
  specName?: string;
  readOnly?: boolean;
  onNodeClick: (node: TalentNode) => void;
}

const SideLabel = ({ children, points }: { children: string; points: number }) => (
  <Stack gap={0} align="center">
    <Text fw={700} c="grape.3" style={{ letterSpacing: 1 }}>
      {children}
    </Text>
    <Text size="xs" c="dimmed">
      {points} pts
    </Text>
  </Stack>
);

export function TalentTree({
  tree,
  selected,
  specName,
  readOnly = false,
  onNodeClick,
}: TalentTreeProps) {
  const [heroSubTreeId, setHeroSubTreeId] = useState<number | null>(
    tree.heroSubTrees[0]?.id ?? null,
  );

  // Sous-arbres héros où des points sont alloués. Un joueur n'en joue qu'un seul,
  // donc on masque les autres : on n'affiche tous les onglets que si rien n'est
  // encore sélectionné (saisie manuelle, pour pouvoir en choisir un).
  const usedHeroSubTreeIds = useMemo(() => {
    const ids = new Set<number>();
    for (const n of tree.nodes.hero) {
      if (n.heroSubTreeId != null && (selected[n.blizzardNodeId]?.rank ?? 0) > 0) {
        ids.add(n.heroSubTreeId);
      }
    }
    return ids;
  }, [tree.nodes.hero, selected]);

  const visibleHeroSubTrees =
    usedHeroSubTreeIds.size > 0
      ? tree.heroSubTrees.filter((h) => usedHeroSubTreeIds.has(h.id))
      : tree.heroSubTrees;

  // Si l'onglet actif n'est plus visible (après un import notamment), on bascule
  // sur le premier sous-arbre visible.
  useEffect(() => {
    if (!visibleHeroSubTrees.some((h) => h.id === heroSubTreeId)) {
      setHeroSubTreeId(visibleHeroSubTrees[0]?.id ?? null);
    }
  }, [visibleHeroSubTrees, heroSubTreeId]);

  const heroNodes = useMemo(
    () => tree.nodes.hero.filter((n) => n.heroSubTreeId === heroSubTreeId),
    [tree.nodes.hero, heroSubTreeId],
  );

  const classPoints = pointsSpent(tree.nodes.class, selected);
  const specPoints = pointsSpent(tree.nodes.spec, selected);
  const heroPoints = pointsSpent(tree.nodes.hero, selected);

  return (
    <Group justify="center" align="center" gap={48} wrap="nowrap">
      <Stack gap="sm" align="center">
        <SideLabel points={classPoints}>CLASS TALENTS</SideLabel>
        <TalentTreePanel
          nodes={tree.nodes.class}
          selected={selected}
          readOnly={readOnly}
          onNodeClick={onNodeClick}
        />
      </Stack>

      {/* Colonne centrale : nom de spé + arbre héros dans un cadre. */}
      <Stack gap="sm" align="center">
        {specName && (
          <Title order={3} c="grape.2" ta="center">
            {specName}
          </Title>
        )}
        {visibleHeroSubTrees.length > 0 && (
          <>
            {visibleHeroSubTrees.length > 1 && (
              <SegmentedControl
                size="xs"
                value={String(heroSubTreeId)}
                onChange={(v) => setHeroSubTreeId(Number(v))}
                data={visibleHeroSubTrees.map((h) => ({ label: h.name, value: String(h.id) }))}
              />
            )}
            <Text size="xs" c="dimmed">
              HERO · {heroPoints} pts
            </Text>
            <Box
              p="md"
              style={{
                border: '1px solid var(--mantine-color-dark-4)',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.25)',
              }}
            >
              <TalentTreePanel
                nodes={heroNodes}
                selected={selected}
                readOnly={readOnly}
                scale={0.85}
                onNodeClick={onNodeClick}
              />
            </Box>
          </>
        )}
      </Stack>

      <Stack gap="sm" align="center">
        <SideLabel points={specPoints}>SPEC TALENTS</SideLabel>
        <TalentTreePanel
          nodes={tree.nodes.spec}
          selected={selected}
          readOnly={readOnly}
          onNodeClick={onNodeClick}
        />
      </Stack>
    </Group>
  );
}
