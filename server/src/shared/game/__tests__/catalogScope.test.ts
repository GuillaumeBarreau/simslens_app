// CatalogScope : saison courante pour Retail, paliers cumulés pour Forever (SIMS-027).
import { catalogScope, catalogSeasons, seasonsUpTo } from '../catalogScope';

describe('catalogSeasons', () => {
  it('keeps only the current season for retail', () => {
    expect(catalogSeasons('retail', 'season-03')).toEqual(['season-03']);
    expect(catalogSeasons('retail', 'season-01')).toEqual(['season-01']);
  });

  it('covers tier 1 for forever at tier 1', () => {
    expect(catalogSeasons('forever', 'tier-1')).toEqual(['tier-1']);
  });

  it('refuses a forever tier missing from the registry', () => {
    expect(() => catalogSeasons('forever', 'tier-9')).toThrow(/Unknown tier "tier-9"/);
    expect(() => catalogSeasons('forever', 'season-03')).toThrow(/Unknown tier/);
  });
});

describe('seasonsUpTo', () => {
  const tiers = ['tier-1', 'tier-2', 'tier-3'];

  it('is cumulative: every tier up to the current one, in order', () => {
    expect(seasonsUpTo(tiers, 'tier-1')).toEqual(['tier-1']);
    expect(seasonsUpTo(tiers, 'tier-2')).toEqual(['tier-1', 'tier-2']);
    expect(seasonsUpTo(tiers, 'tier-3')).toEqual(['tier-1', 'tier-2', 'tier-3']);
  });

  it('returns the current season alone without an ordered list', () => {
    expect(seasonsUpTo(null, 'season-02')).toEqual(['season-02']);
  });

  it('does not alias the registry list', () => {
    const result = seasonsUpTo(tiers, 'tier-3');
    result.push('tier-4');
    expect(tiers).toHaveLength(3);
  });
});

describe('catalogScope', () => {
  it('describes the forever catalog', () => {
    expect(catalogScope('forever', 'tier-1')).toEqual({
      game: 'forever',
      extensions: ['Forever'],
      seasons: ['tier-1'],
    });
  });

  it('describes the retail catalog', () => {
    expect(catalogScope('retail', 'season-03')).toEqual({
      game: 'retail',
      extensions: ['The-War-Within', 'Midnight'],
      seasons: ['season-03'],
    });
  });
});
