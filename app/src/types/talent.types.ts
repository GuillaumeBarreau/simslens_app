export interface TalentEntry {
  talentId: number | null;
  spellId: number | null;
  name: string | null;
  icon: string | null;
  index: number;
}

export type TalentNodeType = 'CLASS' | 'SPEC' | 'HERO';

export interface TalentNode {
  blizzardNodeId: number;
  nodeType: TalentNodeType;
  displayRow: number;
  displayCol: number;
  maxRank: number;
  heroSubTreeId: number | null;
  entries: TalentEntry[];
  unlockNodeIds: number[];
}

export interface HeroSubTree {
  id: number;
  blizzardId: number;
  name: string;
}

export interface TalentTreeData {
  specializationId: number;
  blizzardTreeId: number;
  blizzardSpecId: number;
  heroSubTrees: HeroSubTree[];
  nodes: {
    class: TalentNode[];
    spec: TalentNode[];
    hero: TalentNode[];
  };
}

export interface SelectedNode {
  rank: number;
  choiceIndex?: number;
}

export type SelectedNodes = Record<string, SelectedNode>;

export interface TalentLoadout {
  selectedNodes: SelectedNodes;
  exportString: string | null;
  label: string | null;
  source: string;
  updatedAt: string | null;
}
