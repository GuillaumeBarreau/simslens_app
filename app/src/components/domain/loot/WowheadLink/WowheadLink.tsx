import { DEFAULT_GAME, type GameId, getGameDefinition } from 'config/games';
import React from 'react';
import { useTranslation } from 'react-i18next';

type WowheadRegion = 'eu' | 'us' | 'kr' | 'tw';

interface WowheadLinkProps {
  itemId: number;
  children?: React.ReactNode;
  region?: WowheadRegion;
  itemLevel?: number;
  enableLink?: boolean;
  /** Jeu de l'objet : Retail par défaut, Forever pointe vers `wowhead.com/forever/`. */
  game?: GameId;
  /** Laisse Wowhead remplacer le texte du lien par le nom de l'objet. */
  renameLink?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const REGION_DOMAINS: Record<WowheadRegion, string> = {
  eu: 'www',
  us: 'www',
  kr: 'ko',
  tw: 'cn',
};

/**
 * Lien Wowhead d'un objet et attribut `data-wowhead` du tooltip.
 *
 * Retail : sous-domaine de langue (`fr.wowhead.com`) et `domain=fr`. Les autres jeux
 * prennent la base Wowhead du registre (`config/games`) ; le script `power.js` déduit
 * le jeu de l'URL, sans `data-wowhead` qui le forcerait sur Retail.
 */
export function buildWowheadItemLink({
  itemId,
  game = DEFAULT_GAME,
  lang = 'en',
  region = 'eu',
  itemLevel,
}: {
  itemId: number;
  game?: GameId;
  lang?: string;
  region?: WowheadRegion;
  itemLevel?: number;
}): { href: string; dataWowhead?: string } {
  if (game !== 'retail') {
    return { href: `${getGameDefinition(game).wowheadBaseUrl}item=${itemId}` };
  }

  const domain = lang === 'fr' ? 'fr' : REGION_DOMAINS[region] || 'www';
  let dataWowhead = itemLevel ? `item=${itemId}&ilvl=${itemLevel}` : `item=${itemId}`;
  if (lang === 'fr') dataWowhead += '&domain=fr';

  return { href: `https://${domain}.wowhead.com/item=${itemId}`, dataWowhead };
}

/**
 * Simple Wowhead tooltip component
 * Uses Wowhead's automatic tooltip system
 * By default, only shows tooltip without navigating to Wowhead
 */
export const WowheadLink: React.FC<WowheadLinkProps> = ({
  itemId,
  children,
  region = 'eu',
  itemLevel,
  enableLink = false,
  game = DEFAULT_GAME,
  renameLink = false,
  className,
  style,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.split('-')[0];

  const { href, dataWowhead } = buildWowheadItemLink({
    itemId,
    game,
    lang: currentLang,
    region,
    itemLevel,
  });

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!enableLink) {
      if (e.target === e.currentTarget) {
        e.preventDefault();
      }
    }
  };

  return (
    <a
      href={href}
      data-wowhead={dataWowhead}
      data-wh-rename-link={renameLink ? 'true' : undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      style={{
        display: 'inline',
        textDecoration: 'none',
        cursor: enableLink ? 'pointer' : 'inherit',
        ...style,
      }}
    >
      {children || `Item ${itemId}`}
    </a>
  );
};
