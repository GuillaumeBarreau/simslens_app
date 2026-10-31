import type { SelectedNode, SelectedNodes, TalentNode } from 'types/talent.types';
import { resolveBlizzardIcon } from 'utils/resolveIconPath';

export const CELL = 56; // pas de la grille en px
export const NODE_SIZE = 40; // diamètre/côté d'un nœud

/** URL de l'icône WoW à partir de son slug (ex: "ability_warrior_battleshout"). */
export const iconUrl = (slug: string | null | undefined) =>
  slug ? resolveBlizzardIcon(slug) : null;

export interface PositionedNode {
  node: TalentNode;
  x: number;
  y: number;
}

export interface Edge {
  fromId: number;
  toId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LaidOutTree {
  nodes: PositionedNode[];
  edges: Edge[];
  width: number;
  height: number;
}

const center = (col: number, row: number, minCol: number, minRow: number) => ({
  x: (col - minCol) * CELL + CELL / 2,
  y: (row - minRow) * CELL + CELL / 2,
});

/**
 * Positionne un ensemble de nœuds sur une grille (à partir de displayRow/Col)
 * et calcule les arêtes internes (via unlockNodeIds).
 */
export function layoutNodes(nodes: TalentNode[]): LaidOutTree {
  if (nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

  const cols = nodes.map((n) => n.displayCol);
  const rows = nodes.map((n) => n.displayRow);
  const minCol = Math.min(...cols);
  const minRow = Math.min(...rows);
  const maxCol = Math.max(...cols);
  const maxRow = Math.max(...rows);

  const positioned: PositionedNode[] = nodes.map((node) => {
    const { x, y } = center(node.displayCol, node.displayRow, minCol, minRow);
    return { node, x, y };
  });

  const posById = new Map(positioned.map((p) => [p.node.blizzardNodeId, p]));
  const present = new Set(nodes.map((n) => n.blizzardNodeId));

  const edges: Edge[] = [];
  for (const p of positioned) {
    for (const targetId of p.node.unlockNodeIds || []) {
      if (!present.has(targetId)) continue; // arête sortant du panneau
      const target = posById.get(targetId);
      if (!target) continue;
      edges.push({
        fromId: p.node.blizzardNodeId,
        toId: targetId,
        x1: p.x,
        y1: p.y,
        x2: target.x,
        y2: target.y,
      });
    }
  }

  return {
    nodes: positioned,
    edges,
    width: (maxCol - minCol) * CELL + CELL,
    height: (maxRow - minRow) * CELL + CELL,
  };
}

/**
 * Prérequis inversés : pour chaque nœud, l'ensemble des nœuds qui le débloquent.
 */
export function buildPrerequisites(nodes: TalentNode[]): Map<number, number[]> {
  const present = new Set(nodes.map((n) => n.blizzardNodeId));
  const prereqs = new Map<number, number[]>();
  for (const node of nodes) {
    for (const targetId of node.unlockNodeIds || []) {
      if (!present.has(targetId)) continue;
      const list = prereqs.get(targetId) || [];
      list.push(node.blizzardNodeId);
      prereqs.set(targetId, list);
    }
  }
  return prereqs;
}

/** Un nœud est disponible s'il n'a aucun prérequis, ou si un prérequis est sélectionné. */
export function isNodeAvailable(
  node: TalentNode,
  prereqs: Map<number, number[]>,
  selected: SelectedNodes,
): boolean {
  const parents = prereqs.get(node.blizzardNodeId);
  if (!parents || parents.length === 0) return true;
  return parents.some((parentId) => (selected[parentId]?.rank ?? 0) > 0);
}

/**
 * Calcule l'état suivant d'un nœud au clic (cycle) :
 * - nœud de choix (plusieurs entries) : sélectionne puis fait défiler les options, puis désélectionne ;
 * - nœud multi-rangs : incrémente le rang jusqu'au max, puis désélectionne ;
 * - nœud simple : bascule.
 * Renvoie `undefined` pour désélectionner.
 */
export function nextSelection(
  node: TalentNode,
  current: SelectedNode | undefined,
): SelectedNode | undefined {
  const isChoice = node.entries.length > 1;

  if (isChoice) {
    if (!current) return { rank: 1, choiceIndex: 0 };
    const nextIndex = (current.choiceIndex ?? 0) + 1;
    if (nextIndex >= node.entries.length) return undefined;
    return { rank: 1, choiceIndex: nextIndex };
  }

  const rank = current?.rank ?? 0;
  if (rank >= node.maxRank) return undefined;
  return { rank: rank + 1 };
}

export function pointsSpent(nodes: TalentNode[], selected: SelectedNodes): number {
  return nodes.reduce((sum, n) => sum + (selected[n.blizzardNodeId]?.rank ?? 0), 0);
}

/** Libellé affiché d'un nœud, tenant compte de l'option choisie. */
export function nodeLabel(node: TalentNode, current: SelectedNode | undefined): string {
  if (node.entries.length === 0) return '';
  if (node.entries.length > 1 && current?.choiceIndex != null) {
    return node.entries[current.choiceIndex]?.name ?? node.entries[0].name ?? '';
  }
  return node.entries[0]?.name ?? '';
}
