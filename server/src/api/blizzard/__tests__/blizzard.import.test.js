const { decideMemberImport } = require('../blizzard.import');

describe('decideMemberImport', () => {
  it('crée un personnage inconnu', () => {
    expect(decideMemberImport(null, 2)).toBe('create');
  });

  it('rattache un personnage connu mais sans guilde', () => {
    expect(decideMemberImport({ id: 7, realmId: null }, 2)).toBe('attach');
  });

  it('laisse en place un personnage déjà dans cette guilde', () => {
    expect(decideMemberImport({ id: 7, realmId: 2 }, 2)).toBe('already_in_guild');
    expect(decideMemberImport({ id: 7, realmId: '2' }, 2)).toBe('already_in_guild');
  });

  it('ne retire jamais un personnage à une autre guilde', () => {
    expect(decideMemberImport({ id: 7, realmId: 5 }, 2)).toBe('ignored_other_guild');
  });

  it('refuse de décider si le royaume du personnage est inconnu', () => {
    // C'était le bug : la recherche ne renvoyait que l'id, tout était réaffecté.
    expect(() => decideMemberImport({ id: 7 }, 2)).toThrow(/realmId/);
  });
});
