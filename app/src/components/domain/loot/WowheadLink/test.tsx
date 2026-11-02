import { render, screen } from '@testing-library/react';

import { buildWowheadItemLink, WowheadLink } from './WowheadLink';

const i18n = vi.hoisted(() => ({ language: 'en' }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n }),
}));

describe('buildWowheadItemLink', () => {
  it('garde les liens Retail : sous-domaine de langue, ilvl et domaine du tooltip', () => {
    expect(buildWowheadItemLink({ itemId: 212_000 })).toEqual({
      href: 'https://www.wowhead.com/item=212000',
      dataWowhead: 'item=212000',
    });
    expect(buildWowheadItemLink({ itemId: 212_000, lang: 'fr', itemLevel: 639 })).toEqual({
      href: 'https://fr.wowhead.com/item=212000',
      dataWowhead: 'item=212000&ilvl=639&domain=fr',
    });
    expect(buildWowheadItemLink({ itemId: 1, region: 'kr' }).href).toBe(
      'https://ko.wowhead.com/item=1',
    );
  });

  it('pointe Forever vers wowhead.com/forever/ sans forcer le tooltip Retail', () => {
    expect(buildWowheadItemLink({ itemId: 19019, game: 'forever', lang: 'fr' })).toEqual({
      href: 'https://www.wowhead.com/forever/item=19019',
    });
  });
});

describe('WowheadLink', () => {
  afterEach(() => {
    i18n.language = 'en';
  });

  it('rend un lien Forever renommable par Wowhead', () => {
    render(<WowheadLink itemId={19019} game="forever" renameLink />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://www.wowhead.com/forever/item=19019');
    expect(link.hasAttribute('data-wowhead')).toBe(false);
    expect(link.getAttribute('data-wh-rename-link')).toBe('true');
  });

  it('rend un lien Retail par défaut', () => {
    i18n.language = 'fr-FR';
    render(<WowheadLink itemId={42}>Objet</WowheadLink>);
    const link = screen.getByRole('link', { name: 'Objet' });
    expect(link.getAttribute('href')).toBe('https://fr.wowhead.com/item=42');
    expect(link.getAttribute('data-wowhead')).toBe('item=42&domain=fr');
    expect(link.hasAttribute('data-wh-rename-link')).toBe(false);
  });
});
