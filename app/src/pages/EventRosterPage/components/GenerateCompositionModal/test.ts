import type { CompositionContextPlayer, CompositionWarning } from 'services/roster.service';

import { countMissingSpecialization, missingSpecializationEntries } from './missingSpecialization';
import { offspecFillEntries } from './offspecFill';

describe('missingSpecializationEntries', () => {
  it('lists the players placed with their signup role, then the unplaced ones', () => {
    const warnings: CompositionWarning[] = [
      { type: 'role_short', role: 'HEALER', bossId: 1 },
      { type: 'missing_specialization', characterId: 2, characterName: 'Tanky', role: 'TANK' },
      {
        type: 'unplaced',
        reason: 'missing_specialization',
        characterId: 3,
        characterName: 'Pala',
      },
    ];
    expect(missingSpecializationEntries(warnings)).toEqual([
      { characterId: 2, name: 'Tanky', role: 'TANK' },
      { characterId: 3, name: 'Pala', role: null },
    ]);
  });

  it('returns nothing when every player has a specialization', () => {
    expect(missingSpecializationEntries([{ type: 'empty_pool', bossId: 1 }])).toEqual([]);
  });
});

describe('countMissingSpecialization', () => {
  const player = (characterId: number, missingSpecialization?: boolean) =>
    ({ characterId, missingSpecialization }) as CompositionContextPlayer;

  it('counts the placed and unplaced players without specialization', () => {
    expect(
      countMissingSpecialization({
        pool: [player(1), player(2, true), player(4, false)],
        unplaced: [
          { characterId: 3, name: 'Pala', class: 'paladin', reason: 'missing_specialization' },
        ],
      }),
    ).toBe(2);
  });

  it('accepts a context without unplaced list', () => {
    expect(countMissingSpecialization({ pool: [player(1)] })).toBe(0);
  });
});

describe('offspecFillEntries', () => {
  const fill = (bossId: number, characterId: number, role: string, primaryRole: string) =>
    ({
      type: 'role_offspec_fill',
      bossId,
      characterId,
      characterName: `Char${characterId}`,
      role,
      primaryRole,
    }) as CompositionWarning;

  it('groups the per-boss warnings by player and role', () => {
    expect(
      offspecFillEntries([
        fill(1, 2, 'TANK', 'MELEE'),
        { type: 'role_short', role: 'TANK', bossId: 1, target: 2, available: 1 },
        fill(2, 2, 'TANK', 'MELEE'),
        fill(2, 3, 'HEALER', 'RANGED'),
        fill(3, 2, 'MELEE', 'TANK'),
      ]),
    ).toEqual([
      { characterId: 2, name: 'Char2', role: 'TANK', primaryRole: 'MELEE', bossCount: 2 },
      { characterId: 3, name: 'Char3', role: 'HEALER', primaryRole: 'RANGED', bossCount: 1 },
      { characterId: 2, name: 'Char2', role: 'MELEE', primaryRole: 'TANK', bossCount: 1 },
    ]);
  });

  it('ignores incomplete warnings', () => {
    expect(
      offspecFillEntries([
        { type: 'role_offspec_fill', bossId: 1, characterId: 2, role: 'TANK' },
        { type: 'missing_specialization', characterId: 4, characterName: 'Tanky', role: 'TANK' },
      ]),
    ).toEqual([]);
  });
});
