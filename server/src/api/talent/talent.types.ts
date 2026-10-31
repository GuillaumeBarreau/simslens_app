export interface SelectedNode {
  rank: number;
  choiceIndex?: number;
}

export interface SaveLoadoutBody {
  specializationId: number;
  selectedNodes: Record<string, SelectedNode>;
  exportString?: string | null;
  label?: string | null;
}

export interface ImportBody {
  specializationId: number;
}
