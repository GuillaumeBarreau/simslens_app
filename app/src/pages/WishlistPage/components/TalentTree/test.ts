import type { TalentNode } from 'types/talent.types';

import {
  buildPrerequisites,
  isNodeAvailable,
  layoutNodes,
  nextSelection,
  nodeLabel,
  pointsSpent,
} from './talentLayout';

const node = (over: Partial<TalentNode> & { blizzardNodeId: number }): TalentNode => ({
  nodeType: 'CLASS',
  displayRow: 1,
  displayCol: 1,
  maxRank: 1,
  heroSubTreeId: null,
  entries: [{ talentId: 1, spellId: 1, name: 'A', icon: null, index: 0 }],
  unlockNodeIds: [],
  ...over,
});

describe('layoutNodes', () => {
  it('normalise les positions à partir du coin haut-gauche', () => {
    const { nodes } = layoutNodes([
      node({ blizzardNodeId: 1, displayRow: 3, displayCol: 5 }),
      node({ blizzardNodeId: 2, displayRow: 4, displayCol: 6 }),
    ]);
    // Le premier nœud devient l'origine (demi-cellule de marge).
    expect(nodes[0]).toMatchObject({ x: 28, y: 28 });
    expect(nodes[1]).toMatchObject({ x: 28 + 56, y: 28 + 56 });
  });

  it('trace une arête entre deux nœuds reliés par unlockNodeIds', () => {
    const { edges } = layoutNodes([
      node({ blizzardNodeId: 1, displayRow: 1, displayCol: 1, unlockNodeIds: [2] }),
      node({ blizzardNodeId: 2, displayRow: 2, displayCol: 1 }),
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ fromId: 1, toId: 2 });
  });

  it('ignore les arêtes vers un nœud absent du panneau', () => {
    const { edges } = layoutNodes([node({ blizzardNodeId: 1, unlockNodeIds: [999] })]);
    expect(edges).toHaveLength(0);
  });

  it('renvoie un layout vide pour une liste vide', () => {
    expect(layoutNodes([])).toEqual({ nodes: [], edges: [], width: 0, height: 0 });
  });
});

describe('buildPrerequisites / isNodeAvailable', () => {
  const nodes = [
    node({ blizzardNodeId: 1, unlockNodeIds: [2] }),
    node({ blizzardNodeId: 2, unlockNodeIds: [3] }),
    node({ blizzardNodeId: 3 }),
  ];
  const prereqs = buildPrerequisites(nodes);

  it('un nœud racine est toujours disponible', () => {
    expect(isNodeAvailable(nodes[0], prereqs, {})).toBe(true);
  });

  it('un nœud enfant est indisponible tant que son parent n’est pas pris', () => {
    expect(isNodeAvailable(nodes[1], prereqs, {})).toBe(false);
  });

  it('un nœud enfant devient disponible quand le parent est pris', () => {
    expect(isNodeAvailable(nodes[1], prereqs, { 1: { rank: 1 } })).toBe(true);
  });

  it('un parent à rang 0 ne débloque pas', () => {
    expect(isNodeAvailable(nodes[1], prereqs, { 1: { rank: 0 } })).toBe(false);
  });
});

describe('nextSelection', () => {
  it('bascule un nœud simple (1 rang)', () => {
    const n = node({ blizzardNodeId: 1, maxRank: 1 });
    expect(nextSelection(n, undefined)).toEqual({ rank: 1 });
    expect(nextSelection(n, { rank: 1 })).toBeUndefined();
  });

  it('incrémente un nœud multi-rangs puis désélectionne au max', () => {
    const n = node({ blizzardNodeId: 1, maxRank: 3 });
    expect(nextSelection(n, undefined)).toEqual({ rank: 1 });
    expect(nextSelection(n, { rank: 1 })).toEqual({ rank: 2 });
    expect(nextSelection(n, { rank: 2 })).toEqual({ rank: 3 });
    expect(nextSelection(n, { rank: 3 })).toBeUndefined();
  });

  it('fait défiler les options d’un nœud de choix puis désélectionne', () => {
    const n = node({
      blizzardNodeId: 1,
      entries: [
        { talentId: 1, spellId: 1, name: 'X', icon: null, index: 0 },
        { talentId: 2, spellId: 2, name: 'Y', icon: null, index: 1 },
      ],
    });
    expect(nextSelection(n, undefined)).toEqual({ rank: 1, choiceIndex: 0 });
    expect(nextSelection(n, { rank: 1, choiceIndex: 0 })).toEqual({ rank: 1, choiceIndex: 1 });
    expect(nextSelection(n, { rank: 1, choiceIndex: 1 })).toBeUndefined();
  });
});

describe('pointsSpent', () => {
  it('additionne les rangs sélectionnés', () => {
    const nodes = [node({ blizzardNodeId: 1 }), node({ blizzardNodeId: 2, maxRank: 3 })];
    expect(pointsSpent(nodes, { 1: { rank: 1 }, 2: { rank: 2 } })).toBe(3);
  });

  it('vaut 0 sans sélection', () => {
    expect(pointsSpent([node({ blizzardNodeId: 1 })], {})).toBe(0);
  });
});

describe('nodeLabel', () => {
  const choice = node({
    blizzardNodeId: 1,
    entries: [
      { talentId: 1, spellId: 1, name: 'X', icon: null, index: 0 },
      { talentId: 2, spellId: 2, name: 'Y', icon: null, index: 1 },
    ],
  });

  it('affiche l’option choisie pour un nœud de choix', () => {
    expect(nodeLabel(choice, { rank: 1, choiceIndex: 1 })).toBe('Y');
  });

  it('affiche la première entrée par défaut', () => {
    expect(nodeLabel(choice, undefined)).toBe('X');
  });
});
