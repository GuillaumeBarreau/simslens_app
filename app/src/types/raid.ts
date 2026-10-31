import type { BossBase, difficulties, instances, raid_difficulties, raids } from './shared';

export type Raid = raids;
export type RaidDifficulty = raid_difficulties;
export type Instance = instances;

export type RaidDifficultyWithRelations = raid_difficulties & {
  difficulty_rel?: difficulties;
  raid?: raids;
};

export type RaidWithDifficulties = raids & {
  raid_difficulties?: RaidDifficultyWithRelations[];
};

export type InstanceWithRelations = instances & {
  difficulty?: string;
  raid_id?: number;
  raid_difficulty?: raid_difficulties;
};

/** Boss with optional API-enriched relation fields */
export type Boss = BossBase & {
  raid_id?: number;
  raid?: Pick<raids, 'id' | 'name' | 'image_button' | 'image_button_small'>;
  loot?: Array<{ id: number; name: string; icon: string; quality: number }>;
};

export type { BossBase };
