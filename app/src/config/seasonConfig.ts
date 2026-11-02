import { isFeatureEnabled } from 'config/featureFlags';
import { FOREVER_EXTENSION } from 'config/games/forever';

export const CURRENT_SEASON = import.meta.env.VITE_CURRENT_SEASON;
export const WOW_EXTENSION = import.meta.env.VITE_WOW_EXTENSION;
/** Extensions Retail. Forever est validée à part, derrière le flag `forever`. */
export const VALID_EXTENSIONS = ['The-War-Within', 'Midnight'];

/** Seasons available per extension, in display order (Forever : paliers) */
export const EXTENSION_SEASONS: Record<string, string[]> = {
  'The-War-Within': ['season-03'],
  Midnight: ['season-02', 'season-01'],
  [FOREVER_EXTENSION]: ['tier-1'],
};

/** Extension acceptée dans l'URL : Retail, ou Forever si le flag `forever` est actif. */
export const isValidExtension = (extension?: string | null): boolean => {
  if (!extension) return false;
  if (VALID_EXTENSIONS.includes(extension)) return true;
  return extension === FOREVER_EXTENSION && isFeatureEnabled('forever');
};

export const getRoutePrefix = (extension?: string, guild?: string, season?: string) => {
  return `/${guild}/${extension || WOW_EXTENSION}/${season || CURRENT_SEASON}`;
};

/** Assets partagés par toutes les extensions/saisons (public/src/banner, public/src/icons) */
export const DEFAULT_BANNER_PATH = '/src/banner/default.jpg';
export const DEFAULT_ICON_PATH = '/src/icons/default.png';

export const getSeasonPath = (path: string, extension?: string, season?: string) => {
  return `src/Expansions/${extension || WOW_EXTENSION}/${season || CURRENT_SEASON}/${path}`;
};

/** Returns the first season defined for an extension, or the global default */
export const getDefaultSeasonForExtension = (extension: string): string => {
  const seasons = EXTENSION_SEASONS[extension];
  return seasons && seasons.length > 0 ? seasons[0] : CURRENT_SEASON;
};
