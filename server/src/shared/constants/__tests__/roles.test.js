const {
  CLASS_ROLES,
  DUNGEON_ROLES,
  HEALER_SPECS,
  RAID_ROLES,
  SPEC_ROLES_BY_CLASS,
  TANK_SPECS,
  getClassRoles,
  isRaidRole,
  normalizeRole,
  resolveDpsRange,
  resolveRole,
  resolveRoleWithoutSpec,
  resolveSignupRole,
  roleFromSpec,
} = require('../roles');
const specializationsSeed = require('../../../scripts/data/specializations.json');

describe('normalizeRole', () => {
  it('uppercases and trims a role', () => {
    expect(normalizeRole('  tank ')).toBe('TANK');
  });

  it('returns an empty string for non-string input', () => {
    expect(normalizeRole(null)).toBe('');
    expect(normalizeRole(undefined)).toBe('');
    expect(normalizeRole(42)).toBe('');
  });
});

describe('isRaidRole', () => {
  it.each(RAID_ROLES)('accepts %s', (role) => {
    expect(isRaidRole(role)).toBe(true);
    expect(isRaidRole(role.toLowerCase())).toBe(true);
  });

  it('rejects DPS, which is a dungeon role only', () => {
    expect(isRaidRole('DPS')).toBe(false);
    expect(DUNGEON_ROLES).toContain('DPS');
  });

  it('rejects unknown and malformed roles', () => {
    expect(isRaidRole('SUPPORT')).toBe(false);
    expect(isRaidRole(null)).toBe(false);
  });
});

describe('roleFromSpec', () => {
  it.each([...TANK_SPECS])('maps the %s spec to TANK', (spec) => {
    expect(roleFromSpec(spec)).toBe('TANK');
  });

  it.each([...HEALER_SPECS])('maps the %s spec to HEALER', (spec) => {
    expect(roleFromSpec(spec)).toBe('HEALER');
  });

  it.each(['Arms', 'Fury', 'Shadow', 'Havoc'])('maps the %s spec to DPS', (spec) => {
    expect(roleFromSpec(spec)).toBe('DPS');
  });

  it('falls back to DPS when the spec is unknown or missing', () => {
    expect(roleFromSpec(undefined)).toBe('DPS');
    expect(roleFromSpec(null)).toBe('DPS');
    expect(roleFromSpec('Nonexistent')).toBe('DPS');
  });

  it('is case sensitive, matching the stored spec names', () => {
    expect(roleFromSpec('blood')).toBe('DPS');
  });

  it('uses the class to resolve the spec', () => {
    expect(roleFromSpec('Frost', 'death_knight')).toBe('DPS');
    expect(roleFromSpec('Frost', 'mage')).toBe('DPS');
    expect(roleFromSpec('Vengeance', 'demon_hunter')).toBe('TANK');
    expect(roleFromSpec('Devourer', 'demon_hunter')).toBe('DPS');
    expect(roleFromSpec('Preservation', 'Evoker')).toBe('HEALER');
  });
});

/**
 * Les 40 spécialisations, écrites à la main : la vérité attendue, et non une
 * copie du référentiel testé (SIMS-207).
 */
const EXPECTED_SPEC_ROLES = [
  ['warrior', 'Arms', 'MELEE'],
  ['warrior', 'Fury', 'MELEE'],
  ['warrior', 'Protection', 'TANK'],
  ['paladin', 'Holy', 'HEALER'],
  ['paladin', 'Protection', 'TANK'],
  ['paladin', 'Retribution', 'MELEE'],
  ['hunter', 'Beast Mastery', 'RANGED'],
  ['hunter', 'Marksmanship', 'RANGED'],
  ['hunter', 'Survival', 'MELEE'],
  ['rogue', 'Assassination', 'MELEE'],
  ['rogue', 'Outlaw', 'MELEE'],
  ['rogue', 'Subtlety', 'MELEE'],
  ['priest', 'Discipline', 'HEALER'],
  ['priest', 'Holy', 'HEALER'],
  ['priest', 'Shadow', 'RANGED'],
  ['death_knight', 'Blood', 'TANK'],
  ['death_knight', 'Frost', 'MELEE'],
  ['death_knight', 'Unholy', 'MELEE'],
  ['shaman', 'Elemental', 'RANGED'],
  ['shaman', 'Enhancement', 'MELEE'],
  ['shaman', 'Restoration', 'HEALER'],
  ['mage', 'Arcane', 'RANGED'],
  ['mage', 'Fire', 'RANGED'],
  ['mage', 'Frost', 'RANGED'],
  ['warlock', 'Affliction', 'RANGED'],
  ['warlock', 'Demonology', 'RANGED'],
  ['warlock', 'Destruction', 'RANGED'],
  ['monk', 'Brewmaster', 'TANK'],
  ['monk', 'Mistweaver', 'HEALER'],
  ['monk', 'Windwalker', 'MELEE'],
  ['druid', 'Balance', 'RANGED'],
  ['druid', 'Feral', 'MELEE'],
  ['druid', 'Guardian', 'TANK'],
  ['druid', 'Restoration', 'HEALER'],
  ['demon_hunter', 'Havoc', 'MELEE'],
  ['demon_hunter', 'Vengeance', 'TANK'],
  ['demon_hunter', 'Devourer', 'RANGED'],
  ['evoker', 'Devastation', 'RANGED'],
  ['evoker', 'Preservation', 'HEALER'],
  ['evoker', 'Augmentation', 'RANGED'],
];

describe('spec role catalogue', () => {
  it('covers the 40 specializations', () => {
    expect(EXPECTED_SPEC_ROLES).toHaveLength(40);
    const count = Object.values(SPEC_ROLES_BY_CLASS).reduce(
      (n, specs) => n + Object.keys(specs).length,
      0,
    );
    expect(count).toBe(40);
  });

  it('matches the seed of specializations.role', () => {
    const fromSeed = specializationsSeed.map((s) => [s.class, s.name, s.role.toUpperCase()]).sort();
    const fromCatalogue = Object.entries(SPEC_ROLES_BY_CLASS)
      .flatMap(([cls, specs]) => Object.entries(specs).map(([name, role]) => [cls, name, role]))
      .sort();
    expect(fromCatalogue).toEqual(fromSeed);
  });
});

describe('resolveRole', () => {
  it.each(EXPECTED_SPEC_ROLES)('resolves %s %s to %s', (cls, spec, role) => {
    expect(resolveRole(cls, spec)).toBe(role);
  });

  it.each(EXPECTED_SPEC_ROLES)('resolves %s %s to %s from its stored role', (cls, spec, role) => {
    expect(resolveRole(cls, spec, role.toLowerCase())).toBe(role);
  });

  it('places a Frost Mage at range and a Frost Death Knight in melee', () => {
    expect(resolveRole('mage', 'Frost')).toBe('RANGED');
    expect(resolveRole('death_knight', 'Frost')).toBe('MELEE');
  });

  it('normalizes the class, whatever its spelling', () => {
    expect(resolveRole('Mage', 'Frost')).toBe('RANGED');
    expect(resolveRole('Death Knight', 'Frost')).toBe('MELEE');
    expect(resolveRole(' DEMON HUNTER ', 'Devourer')).toBe('RANGED');
  });

  it('prefers the stored specialization role', () => {
    expect(resolveRole('death_knight', 'Frost', 'ranged')).toBe('RANGED');
    expect(resolveRole('warrior', 'Arms', 'TANK')).toBe('TANK');
  });

  it('falls back on the catalogue when the stored role is not a raid role', () => {
    expect(resolveRole('mage', 'Frost', 'dps')).toBe('RANGED');
    expect(resolveRole('death_knight', 'Frost', 'dps')).toBe('MELEE');
    expect(resolveRole('demon_hunter', 'Vengeance', '')).toBe('TANK');
  });

  it('falls back on the spec name alone when it is unambiguous', () => {
    expect(resolveRole(null, 'Havoc')).toBe('MELEE');
    expect(resolveRole(null, 'Devourer')).toBe('RANGED');
    expect(resolveRole('unknown_class', 'Protection')).toBe('TANK');
    expect(resolveRole('warrior', 'Fire')).toBe('RANGED');
  });

  it('defaults to RANGED for an ambiguous, unknown or missing spec', () => {
    expect(resolveRole(null, 'Frost')).toBe('RANGED');
    expect(resolveRole('mage', 'Nonexistent')).toBe('RANGED');
    expect(resolveRole('mage', null)).toBe('RANGED');
    expect(resolveRole(undefined, undefined)).toBe('RANGED');
  });
});

describe('resolveDpsRange', () => {
  it('places tank specs in melee and healer specs at range', () => {
    expect(resolveDpsRange('warrior', 'Protection')).toBe('MELEE');
    expect(resolveDpsRange('demon_hunter', 'Vengeance')).toBe('MELEE');
    expect(resolveDpsRange('priest', 'Holy')).toBe('RANGED');
  });

  it('keeps the range of DPS specs', () => {
    expect(resolveDpsRange('mage', 'Frost')).toBe('RANGED');
    expect(resolveDpsRange('death_knight', 'Frost')).toBe('MELEE');
    expect(resolveDpsRange('evoker', 'Augmentation')).toBe('RANGED');
  });
});

describe('resolveSignupRole', () => {
  const character = (cls, name, role = null) => ({ class: cls, specialization: { name, role } });

  it('keeps a declared raid role', () => {
    expect(resolveSignupRole('healer', character('mage', 'Frost'))).toBe('HEALER');
    expect(resolveSignupRole('MELEE', character('mage', 'Frost'))).toBe('MELEE');
  });

  it('splits a declared DPS by the range of its spec', () => {
    expect(resolveSignupRole('DPS', character('mage', 'Frost'))).toBe('RANGED');
    expect(resolveSignupRole('DPS', character('death_knight', 'Frost'))).toBe('MELEE');
    expect(resolveSignupRole('DPS', character('paladin', 'Protection', 'tank'))).toBe('MELEE');
  });

  it('uses the specialization when no role is declared', () => {
    expect(resolveSignupRole(null, character('demon_hunter', 'Vengeance', 'tank'))).toBe('TANK');
    expect(resolveSignupRole('', character('evoker', 'Preservation'))).toBe('HEALER');
    expect(resolveSignupRole(undefined, character('demon_hunter', 'Devourer'))).toBe('RANGED');
  });

  it('defaults to RANGED without character or spec', () => {
    expect(resolveSignupRole(null, null)).toBe('RANGED');
    expect(resolveSignupRole('DPS', { class: 'mage', specialization: null })).toBe('RANGED');
  });
});

describe('resolveRoleWithoutSpec', () => {
  it('keeps a declared raid role', () => {
    expect(resolveRoleWithoutSpec('tank', 'warrior')).toBe('TANK');
    expect(resolveRoleWithoutSpec('HEALER', 'druid')).toBe('HEALER');
  });

  it('splits a declared DPS by the only DPS range of the class', () => {
    expect(resolveRoleWithoutSpec('DPS', 'rogue')).toBe('MELEE');
    expect(resolveRoleWithoutSpec('DPS', 'Death Knight')).toBe('MELEE');
    expect(resolveRoleWithoutSpec('DPS', 'mage')).toBe('RANGED');
  });

  it('defaults a declared DPS to RANGED when the class plays both ranges', () => {
    expect(resolveRoleWithoutSpec('DPS', 'hunter')).toBe('RANGED');
    expect(resolveRoleWithoutSpec('DPS', 'druid')).toBe('RANGED');
    expect(resolveRoleWithoutSpec('DPS', null)).toBe('RANGED');
  });

  it('uses the only role of the class when no role is declared', () => {
    expect(resolveRoleWithoutSpec(null, 'mage')).toBe('RANGED');
    expect(resolveRoleWithoutSpec('', 'rogue')).toBe('MELEE');
  });

  it('returns null when nothing gives a role', () => {
    expect(resolveRoleWithoutSpec(null, 'paladin')).toBeNull();
    expect(resolveRoleWithoutSpec('SUPPORT', 'druid')).toBeNull();
    expect(resolveRoleWithoutSpec(undefined, undefined)).toBeNull();
  });
});

describe('getClassRoles', () => {
  it.each([
    ['death_knight', ['TANK', 'MELEE']],
    ['demon_hunter', ['TANK', 'MELEE', 'RANGED']],
    ['druid', ['TANK', 'HEALER', 'MELEE', 'RANGED']],
    ['evoker', ['HEALER', 'RANGED']],
    ['hunter', ['MELEE', 'RANGED']],
    ['mage', ['RANGED']],
    ['monk', ['TANK', 'HEALER', 'MELEE']],
    ['paladin', ['TANK', 'HEALER', 'MELEE']],
    ['priest', ['HEALER', 'RANGED']],
    ['rogue', ['MELEE']],
    ['shaman', ['HEALER', 'MELEE', 'RANGED']],
    ['warlock', ['RANGED']],
    ['warrior', ['TANK', 'MELEE']],
  ])('lists the roles of %s', (cls, roles) => {
    expect(getClassRoles(cls)).toEqual(roles);
  });

  it('recognizes the class as stored and as displayed', () => {
    expect(getClassRoles('death_knight')).not.toEqual([]);
    expect(getClassRoles('Death Knight')).toEqual(getClassRoles('death_knight'));
    expect(getClassRoles('Mage')).toEqual(['RANGED']);
  });

  it('returns no role for an unknown or missing class', () => {
    expect(getClassRoles('tinker')).toEqual([]);
    expect(getClassRoles(null)).toEqual([]);
    expect(getClassRoles(undefined)).toEqual([]);
  });

  it('covers every class of the catalogue', () => {
    expect(Object.keys(CLASS_ROLES).sort()).toEqual(Object.keys(SPEC_ROLES_BY_CLASS).sort());
  });
});
