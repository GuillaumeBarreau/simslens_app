const { resolveBuffs, selectForBuffs } = require('../composition.selection');

describe('resolveBuffs', () => {
  it('enables every buff but powerInfusion when the realm has no configuration', () => {
    const buffs = resolveBuffs(null);
    expect(buffs.find((b) => b.key === 'arcaneIntellect').enabled).toBe(true);
    expect(buffs.find((b) => b.key === 'powerInfusion').enabled).toBe(false);
  });

  it('follows the realm configuration when present', () => {
    const buffs = resolveBuffs({ arcaneIntellect: false, powerInfusion: true });
    expect(buffs.find((b) => b.key === 'arcaneIntellect').enabled).toBe(false);
    expect(buffs.find((b) => b.key === 'powerInfusion').enabled).toBe(true);
  });
});

describe('selectForBuffs', () => {
  const run = ({ candidates, selectedClasses = [], target = 2 }) => {
    const selected = new Map();
    const warnings = [];
    selectForBuffs({
      bossId: 1,
      candidatesByRole: { RANGED: candidates },
      selected,
      selectedClasses: new Set(selectedClasses),
      roleTargets: { TANK: 0, HEALER: 0, MELEE: 0, RANGED: target },
      roleFilled: { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 },
      scoredByCandidateId: new Map(candidates.map((c) => [c.characterId, c.score])),
      activeBuffs: [{ key: 'arcaneIntellect', classes: ['Mage'] }],
      warnings,
    });
    return { selected, warnings };
  };

  it('picks the best-scored main-spec provider of an uncovered buff', () => {
    const { selected } = run({
      candidates: [
        { characterId: 1, class: 'Mage', isPrimaryRole: true, score: 1 },
        { characterId: 2, class: 'Mage', isPrimaryRole: true, score: 5 },
        { characterId: 3, class: 'Mage', isPrimaryRole: false, score: 9 },
      ],
    });
    expect([...selected.keys()]).toEqual([2]);
    expect(selected.get(2).reason).toBe('buff:arcaneIntellect');
  });

  it('skips a buff already covered by the selected classes', () => {
    const { selected } = run({
      candidates: [{ characterId: 1, class: 'Mage', isPrimaryRole: true, score: 1 }],
      selectedClasses: ['Mage'],
    });
    expect(selected.size).toBe(0);
  });

  it('warns when no candidate provides the buff', () => {
    const { warnings } = run({
      candidates: [{ characterId: 1, class: 'Rogue', isPrimaryRole: true, score: 1 }],
    });
    expect(warnings).toEqual([{ type: 'buff_uncovered', buff: 'arcaneIntellect', bossId: 1 }]);
  });
});
