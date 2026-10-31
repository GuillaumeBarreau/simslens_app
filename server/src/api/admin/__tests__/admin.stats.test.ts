import { type StatsCharacter, summarizeCharacters } from '../admin.stats';

const character = (over: Partial<StatsCharacter> = {}): StatsCharacter => ({
  archived: 0,
  status: 'approved',
  class: 'mage',
  ilvl: 600,
  specialization: { role: 'dps' },
  ...over,
});

describe('summarizeCharacters', () => {
  it('counts active, pending and archived characters', () => {
    const stats = summarizeCharacters(2, [
      character(),
      character({ status: 'pending' }),
      character({ archived: 1 }),
    ]);
    expect(stats).toMatchObject({
      totalRealms: 2,
      totalCharacters: 3,
      active: 1,
      pending: 1,
      archived: 1,
    });
  });

  it('breaks down active characters only, by role and by class', () => {
    const stats = summarizeCharacters(1, [
      character({ class: 'priest', specialization: { role: 'healer' } }),
      character({ class: 'mage' }),
      character({ class: 'mage', status: 'pending' }),
    ]);
    expect(stats.byRole).toEqual({ healer: 1, dps: 1 });
    expect(stats.byClass).toEqual({ priest: 1, mage: 1 });
  });

  it('defaults an unknown role to dps and an unknown class to Unknown', () => {
    const stats = summarizeCharacters(1, [character({ class: null, specialization: null })]);
    expect(stats.byRole).toEqual({ dps: 1 });
    expect(stats.byClass).toEqual({ Unknown: 1 });
  });

  it('rounds the average ilvl of active characters, missing ilvl counting as 0', () => {
    const stats = summarizeCharacters(1, [character({ ilvl: 601 }), character({ ilvl: null })]);
    expect(stats.avgIlvl).toBe(301);
  });

  it('reports an average ilvl of 0 without active characters', () => {
    expect(summarizeCharacters(0, []).avgIlvl).toBe(0);
  });
});
