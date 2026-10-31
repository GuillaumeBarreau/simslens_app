import type { SyntheticEvent } from 'react';

import { CURRENT_SEASON, WOW_EXTENSION } from '../config/seasonConfig';

/**
 * Resolve Blizzard CDN icon URL for items, abilities, etc.
 * Used for item icons like "inv_sword_04"
 */
export const resolveBlizzardIcon = (icon: string | undefined) => {
  if (!icon) return '';
  return `https://render.worldofwarcraft.com/us/icons/56/${icon}.jpg`;
};

/**
 * CDN de secours (Wowhead), à n'utiliser qu'en repli de `resolveBlizzardIcon`.
 *
 * Blizzard publie l'art d'un nouveau patch sur son CDN de rendu avec du retard :
 * à la sortie de la 12.1, 84 % des icônes de la saison 2 y répondaient 403 alors
 * qu'elles étaient déjà servies ici. Garder Blizzard en source principale fait
 * que le repli se désamorce tout seul une fois l'art publié.
 */
export const resolveFallbackIcon = (icon: string | undefined) => {
  if (!icon) return '';
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
};

/**
 * Handler `onError` pour un `<img>` nu : bascule une seule fois vers le CDN de
 * secours. Les `<Image>` Mantine utilisent `fallbackSrc` à la place.
 */
export const handleIconError =
  (icon: string | undefined) => (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const fallback = resolveFallbackIcon(icon);
    if (!fallback || img.src === fallback) return;
    img.src = fallback;
  };

/**
 * Resolve local boss/raid image path from public folder
 * Used for boss banners and raid-specific images
 */
export const resolveIconPath = (icon: string | undefined, extension?: string, season?: string) => {
  if (!icon) return '';
  const ext = extension || WOW_EXTENSION;
  const ssn = season || CURRENT_SEASON;
  const path = `src/Expansions/${ext}/${ssn}/icons/${icon}.png`;
  return path.startsWith('/') ? path : `/${path}`;
};
