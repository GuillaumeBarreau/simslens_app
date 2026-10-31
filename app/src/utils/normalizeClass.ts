/**
 * Normalizes character class input to a standardized slug string.
 * Handles numeric IDs (e.g. 12 -> demon_hunter) and string variations.
 */
export const normalizeClass = (cls: string | number | undefined): string => {
  if (!cls) return '';
  const clsStr = cls.toString().toLowerCase();

  if (clsStr === '12') return 'demon_hunter';

  return clsStr;
};
