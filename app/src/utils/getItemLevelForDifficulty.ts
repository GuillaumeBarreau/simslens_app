import { getDefaultSeasonForExtension } from 'config/seasonConfig';
import { Difficulty } from 'contexts/DifficultyContext';

/**
 * Item level du premier palier (1/6) de la track associée à chaque difficulté :
 * LFR → Veteran, Normal → Champion, Heroic → Hero, Mythic → Myth.
 * Les paliers changent à chaque saison, d'où l'indexation extension → saison.
 */
const ILVL_BY_EXTENSION_SEASON: Record<string, Record<string, Record<string, number>>> = {
  Midnight: {
    'season-02': {
      lfr: 279,
      normal: 292,
      heroic: 305,
      mythic: 318,
    },
    'season-01': {
      lfr: 250,
      normal: 263,
      heroic: 276,
      mythic: 289,
    },
  },
  'The-War-Within': {
    'season-03': {
      lfr: 130,
      normal: 143,
      heroic: 156,
      mythic: 169,
    },
  },
};

export const getItemLevelForDifficulty = (
  diff: Difficulty | string,
  extension?: string,
  season?: string,
): number => {
  const ext = extension && ILVL_BY_EXTENSION_SEASON[extension] ? extension : 'The-War-Within';
  const seasons = ILVL_BY_EXTENSION_SEASON[ext];
  const ssn = season && seasons[season] ? season : getDefaultSeasonForExtension(ext);
  const map = seasons[ssn] ?? seasons[Object.keys(seasons)[0]];
  return map[diff] ?? 0;
};
