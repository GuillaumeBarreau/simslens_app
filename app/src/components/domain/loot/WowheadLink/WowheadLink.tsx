import React from 'react';
import { useTranslation } from 'react-i18next';

interface WowheadLinkProps {
  itemId: number;
  children?: React.ReactNode;
  region?: 'eu' | 'us' | 'kr' | 'tw';
  itemLevel?: number;
  enableLink?: boolean;
  className?: string;
  style?: React.CSSProperties;
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
  className,
  style,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.split('-')[0];

  const domainMap: Record<string, string> = {
    eu: 'www',
    us: 'www',
    kr: 'ko',
    tw: 'cn',
  };

  let domain = domainMap[region] || 'www';

  if (currentLang === 'fr') {
    domain = 'fr';
  }

  const href = `https://${domain}.wowhead.com/item=${itemId}`;

  let dataWowhead = itemLevel ? `item=${itemId}&ilvl=${itemLevel}` : `item=${itemId}`;

  if (currentLang === 'fr') {
    dataWowhead += '&domain=fr';
  }

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
