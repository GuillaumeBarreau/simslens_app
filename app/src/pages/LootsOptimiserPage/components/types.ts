import type { InstanceWithRelations } from 'types/raid';

export type Instance = InstanceWithRelations & {
  image_button_small?: string;
  image_button?: string;
  rd_image_button?: string;
};

export interface Raid {
  id: string | number;
  name: string;
  difficulty?: string | number;
  raidDifficultyId?: number;
  image_button_small?: string;
  image_button?: string;
  image_background?: string;
  rd_image_button?: string;
}

export interface RaidChooserProps {
  onSelect: (raid: Raid) => void;
}
