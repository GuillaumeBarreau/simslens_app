import { bossUpgradeSpecOptions, requestedSpecializationId } from './bossUpgradeSpecs';

const ELE = { id: 262, name: 'Elemental', icon: null, role: 'ranged' };
const RESTO = { id: 264, name: 'Restoration', icon: null, role: 'healer' };

describe('requestedSpecializationId', () => {
  it('uses the spec chosen for this character', () => {
    expect(requestedSpecializationId({ characterId: 1, specializationId: 264 }, 1, 262)).toBe(264);
  });

  it('falls back to the default spec without a choice, or with a choice for another character', () => {
    expect(requestedSpecializationId(null, 1, 262)).toBe(262);
    expect(requestedSpecializationId({ characterId: 2, specializationId: 264 }, 1, 262)).toBe(262);
    expect(requestedSpecializationId(null, 1, null)).toBeNull();
  });
});

describe('bossUpgradeSpecOptions', () => {
  it('lists the simulated specs', () => {
    expect(bossUpgradeSpecOptions({ specialization: ELE, specializations: [RESTO, ELE] })).toEqual([
      { value: '264', label: 'Restoration' },
      { value: '262', label: 'Elemental' },
    ]);
  });

  it('keeps the selected spec first when it has no sim', () => {
    expect(bossUpgradeSpecOptions({ specialization: ELE, specializations: [RESTO] })).toEqual([
      { value: '262', label: 'Elemental' },
      { value: '264', label: 'Restoration' },
    ]);
  });

  it('returns nothing without data', () => {
    expect(bossUpgradeSpecOptions(undefined)).toEqual([]);
    expect(bossUpgradeSpecOptions({ specialization: null, specializations: [] })).toEqual([]);
  });
});
