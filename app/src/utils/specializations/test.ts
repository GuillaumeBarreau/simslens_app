import { describe, expect, it } from 'vitest';

import {
  buildSpecializationsPayload,
  offSpecsWithoutPrimary,
  specializationKey,
  specializationsOfClass,
} from './index';

const CLASSES = [
  {
    id: 6,
    name: 'death_knight',
    specializations: [
      { id: 250, name: 'Blood', classId: 6, role: 'tank' },
      { id: 251, name: 'Frost', classId: 6, role: 'melee' },
    ],
  },
  {
    id: 3,
    name: 'hunter',
    specializations: [{ id: 253, name: 'Beast Mastery', classId: 3, role: 'ranged' }],
  },
];

describe('specializationKey', () => {
  it('turns an English spec name into a translation key', () => {
    expect(specializationKey('Beast Mastery')).toBe('beast_mastery');
    expect(specializationKey(' Frost ')).toBe('frost');
  });
});

describe('specializationsOfClass', () => {
  it('finds the specs of a class, whatever its spelling', () => {
    expect(specializationsOfClass(CLASSES, 'Death Knight').map((s) => s.id)).toEqual([250, 251]);
    expect(specializationsOfClass(CLASSES, 'death_knight').map((s) => s.id)).toEqual([250, 251]);
  });

  it('returns no spec for an unknown class or before the list is loaded', () => {
    expect(specializationsOfClass(CLASSES, 'tinker')).toEqual([]);
    expect(specializationsOfClass(undefined, 'hunter')).toEqual([]);
    expect(specializationsOfClass(CLASSES, '')).toEqual([]);
  });
});

describe('offSpecsWithoutPrimary', () => {
  it('removes the new primary spec from the off-specs', () => {
    expect(offSpecsWithoutPrimary([250, 251], 251)).toEqual([250]);
  });

  it('keeps the off-specs when there is no primary spec', () => {
    expect(offSpecsWithoutPrimary([250, 251], null)).toEqual([250, 251]);
  });
});

describe('buildSpecializationsPayload', () => {
  it('sends the primary spec only when it changes', () => {
    expect(buildSpecializationsPayload(250, 250, [251])).toEqual({ offSpecializationIds: [251] });
    expect(buildSpecializationsPayload(250, 251, [250])).toEqual({
      specializationId: 251,
      offSpecializationIds: [250],
    });
  });

  it('never sends the primary spec among the off-specs', () => {
    expect(buildSpecializationsPayload(250, 251, [250, 251])).toEqual({
      specializationId: 251,
      offSpecializationIds: [250],
    });
  });

  it('sends only the off-specs of a character still without primary spec', () => {
    expect(buildSpecializationsPayload(null, null, [250])).toEqual({ offSpecializationIds: [250] });
  });
});
