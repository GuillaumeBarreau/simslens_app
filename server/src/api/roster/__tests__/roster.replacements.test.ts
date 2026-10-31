import { resolveBuffs } from '../../composition/composition.selection';
import type { ActiveBuff, Holder, ReplacementCandidate } from '../roster.replacements';
import {
  findVacancies,
  isWithdrawn,
  lostBuffsOf,
  needByBossOf,
  rankReplacements,
} from '../roster.replacements';

const BUFFS: ActiveBuff[] = [
  { key: 'arcaneIntellect', providers: ['Mage'] },
  { key: 'bloodlust', providers: ['Shaman', 'Mage', 'Hunter', 'Evoker'] },
  { key: 'fortitude', providers: ['Priest'] },
];

let nextId = 100;
const candidate = (over: Partial<ReplacementCandidate> = {}): ReplacementCandidate => {
  const id = over.characterId ?? nextId++;
  return {
    characterId: id,
    name: `C${id}`,
    class: 'Warlock',
    spec: 'Affliction',
    userId: `u${id}`,
    role: 'RANGED',
    playableRoles: ['RANGED'],
    needByBoss: new Map(),
    ...over,
  };
};

const holder = (over: Partial<Holder> = {}): Holder => ({
  bossId: 1,
  characterId: 1,
  name: 'Holder',
  class: 'Mage',
  spec: 'Frost',
  userId: 'h1',
  role: 'RANGED',
  ...over,
});

const need = (bossId: number, bisCount: number, bestGain = 0) =>
  new Map([[bossId, { bisCount, bestGain }]]);

describe('isWithdrawn', () => {
  it('is true for a member who only declared ABSENT', () => {
    expect(isWithdrawn(['ABSENT'])).toBe(true);
  });

  it('is false when another signup keeps the member available', () => {
    expect(isWithdrawn(['ABSENT', 'PRESENT'])).toBe(false);
    expect(isWithdrawn(['ABSENT', 'LATE'])).toBe(false);
    expect(isWithdrawn(['ABSENT', 'TENTATIVE'])).toBe(false);
  });

  it('is false for a holder placed without any signup', () => {
    expect(isWithdrawn([])).toBe(false);
  });

  it('is false for a benched member', () => {
    expect(isWithdrawn(['BENCH'])).toBe(false);
  });
});

describe('lostBuffsOf', () => {
  it('lists the buffs only the leaving class brought', () => {
    expect(lostBuffsOf('Mage', ['Priest', 'Warrior'], BUFFS)).toEqual([
      'arcaneIntellect',
      'bloodlust',
    ]);
  });

  it('keeps a buff another remaining class still provides', () => {
    expect(lostBuffsOf('Mage', ['Shaman'], BUFFS)).toEqual(['arcaneIntellect']);
  });

  it('returns nothing for an unknown class', () => {
    expect(lostBuffsOf(null, [], BUFFS)).toEqual([]);
  });
});

describe('rankReplacements', () => {
  it('returns at most 3 replacements', () => {
    const candidates = Array.from({ length: 5 }, () => candidate());
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock' }),
      remaining: [],
      candidates,
      activeBuffs: BUFFS,
    });
    expect(result).toHaveLength(3);
  });

  it('only keeps candidates able to play the vacant role', () => {
    const healer = candidate({ class: 'Priest', role: 'HEALER', playableRoles: ['HEALER'] });
    const ranged = candidate();
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock' }),
      remaining: [],
      candidates: [healer, ranged],
      activeBuffs: BUFFS,
    });
    expect(result.map((r) => r.characterId)).toEqual([ranged.characterId]);
  });

  it('puts the provider of the lost buff first, before a bigger BiS need', () => {
    const needy = candidate({ needByBoss: need(1, 3) });
    const mage = candidate({ class: 'Mage', needByBoss: need(1, 0) });
    const result = rankReplacements({
      vacancy: holder({ class: 'Mage' }),
      remaining: [{ characterId: 2, class: 'Shaman', userId: 'h2' }],
      candidates: [needy, mage],
      activeBuffs: BUFFS,
    });
    expect(result[0]).toMatchObject({
      characterId: mage.characterId,
      coveredBuffs: ['arcaneIntellect'],
    });
    expect(result[1].characterId).toBe(needy.characterId);
  });

  it('prefers the main-spec buff provider over an off-spec one', () => {
    const offspec = candidate({
      class: 'Mage',
      role: 'HEALER',
      playableRoles: ['HEALER', 'RANGED'],
      needByBoss: need(1, 5),
    });
    const mainspec = candidate({ class: 'Mage', needByBoss: need(1, 0) });
    const result = rankReplacements({
      vacancy: holder({ class: 'Mage' }),
      remaining: [],
      candidates: [offspec, mainspec],
      activeBuffs: BUFFS,
    });
    expect(result[0]).toMatchObject({ characterId: mainspec.characterId, isPrimaryRole: true });
    expect(result[1]).toMatchObject({ characterId: offspec.characterId, isPrimaryRole: false });
  });

  it('ranks by BiS need, then DPS gain, when no buff is lost', () => {
    const low = candidate({ needByBoss: need(1, 0, 900) });
    const bis = candidate({ needByBoss: need(1, 2, 10) });
    const gain = candidate({ needByBoss: need(1, 0, 1500) });
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock' }),
      remaining: [],
      candidates: [low, bis, gain],
      activeBuffs: BUFFS,
    });
    expect(result.map((r) => r.characterId)).toEqual([
      bis.characterId,
      gain.characterId,
      low.characterId,
    ]);
  });

  it('reads the BiS need of the vacant boss only', () => {
    const otherBoss = candidate({ needByBoss: need(2, 4) });
    const thisBoss = candidate({ needByBoss: need(1, 1) });
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock', bossId: 1 }),
      remaining: [],
      candidates: [otherBoss, thisBoss],
      activeBuffs: BUFFS,
    });
    expect(result[0].characterId).toBe(thisBoss.characterId);
    expect(result[1].bisCount).toBe(0);
  });

  it('puts main-spec candidates before off-spec ones', () => {
    const offspec = candidate({
      class: 'Priest',
      role: 'HEALER',
      playableRoles: ['HEALER', 'RANGED'],
      needByBoss: need(1, 5),
    });
    const mainspec = candidate({ needByBoss: need(1, 0) });
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock' }),
      remaining: [],
      candidates: [offspec, mainspec],
      activeBuffs: BUFFS,
    });
    expect(result.map((r) => r.characterId)).toEqual([mainspec.characterId, offspec.characterId]);
  });

  it('excludes members already placed on the boss and characters already placed', () => {
    const placedMember = candidate({ userId: 'h2' });
    const placedCharacter = candidate({ characterId: 2, userId: null });
    const free = candidate();
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock' }),
      remaining: [{ characterId: 2, class: 'Rogue', userId: 'h2' }],
      candidates: [placedMember, placedCharacter, free],
      activeBuffs: BUFFS,
    });
    expect(result.map((r) => r.characterId)).toEqual([free.characterId]);
  });

  it('shows a member only once, with their best character', () => {
    const alt = candidate({ userId: 'same', needByBoss: need(1, 0) });
    const main = candidate({ userId: 'same', needByBoss: need(1, 2) });
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock' }),
      remaining: [],
      candidates: [alt, main],
      activeBuffs: BUFFS,
    });
    expect(result.map((r) => r.characterId)).toEqual([main.characterId]);
  });

  it('honours a custom limit', () => {
    const candidates = Array.from({ length: 5 }, () => candidate());
    const result = rankReplacements({
      vacancy: holder({ class: 'Warlock' }),
      remaining: [],
      candidates,
      activeBuffs: BUFFS,
      limit: 1,
    });
    expect(result).toHaveLength(1);
  });

  it('ignores a candidate without class when a buff is lost', () => {
    const noClass = candidate({ class: null as unknown as string, needByBoss: need(1, 9) });
    const mage = candidate({ class: 'Mage' });
    const result = rankReplacements({
      vacancy: holder({ class: 'Mage' }),
      remaining: [],
      candidates: [noClass, mage],
      activeBuffs: BUFFS,
    });
    expect(result[0].characterId).toBe(mage.characterId);
    expect(result[1]).toMatchObject({ characterId: noClass.characterId, coveredBuffs: [] });
  });

  it('keeps only one character for a member with a main and a reroll, the buff provider winning', () => {
    const main = candidate({ userId: 'same', class: 'Warlock', needByBoss: need(1, 4) });
    const reroll = candidate({ userId: 'same', class: 'Mage', needByBoss: need(1, 0) });
    const result = rankReplacements({
      vacancy: holder({ class: 'Mage' }),
      remaining: [],
      candidates: [main, reroll],
      activeBuffs: BUFFS,
    });
    expect(result.map((r) => r.characterId)).toEqual([reroll.characterId]);
  });

  it('excludes the reroll of a member already placed on the boss', () => {
    const reroll = candidate({ userId: 'h2', class: 'Mage' });
    const result = rankReplacements({
      vacancy: holder({ class: 'Mage' }),
      remaining: [{ characterId: 2, class: 'Priest', userId: 'h2' }],
      candidates: [reroll],
      activeBuffs: BUFFS,
    });
    expect(result).toEqual([]);
  });

  it('computes lost buffs per vacancy when several holders of a boss withdraw', () => {
    const buffs: ActiveBuff[] = [
      { key: 'a', providers: ['Mage'] },
      { key: 'b', providers: ['Priest'] },
    ];
    const needy = candidate({ needByBoss: need(1, 5) });
    const priest = candidate({ class: 'Priest', role: 'RANGED', needByBoss: need(1, 0) });
    const mage = candidate({ class: 'Mage', needByBoss: need(1, 1) });
    // Une vacante Mage + Priest partis : les deux buffs sont perdus.
    const vacancies = findVacancies({
      holders: [
        holder({ characterId: 1, userId: 'x', class: 'Mage' }),
        holder({ characterId: 2, userId: 'y', class: 'Priest' }),
      ],
      statusesByCharacterId: new Map([
        [1, ['ABSENT']],
        [2, ['ABSENT']],
      ]),
      candidates: [needy, priest, mage],
      activeBuffs: buffs,
    });
    expect(vacancies[0].lostBuffs).toEqual(['a']);
    expect(vacancies[1].lostBuffs).toEqual(['b']);
    expect(vacancies[0].replacements[0].characterId).toBe(mage.characterId);
    expect(vacancies[1].replacements[0].characterId).toBe(priest.characterId);
  });

  it('returns an empty list when nobody can take the spot', () => {
    expect(
      rankReplacements({
        vacancy: holder({ role: 'TANK' }),
        remaining: [],
        candidates: [candidate()],
        activeBuffs: BUFFS,
      }),
    ).toEqual([]);
  });
});

describe('findVacancies', () => {
  it('reports each withdrawn holder per boss, with lost buffs and replacements', () => {
    const mage = holder({ characterId: 1, userId: 'absent', class: 'Mage', bossId: 1 });
    const mageBoss2 = { ...mage, bossId: 2 };
    const priest = holder({ characterId: 2, userId: 'here', class: 'Priest', role: 'HEALER' });
    const replacement = candidate({ class: 'Mage' });

    const vacancies = findVacancies({
      holders: [mage, mageBoss2, priest],
      statusesByCharacterId: new Map([
        [1, ['ABSENT']],
        [2, ['PRESENT']],
      ]),
      candidates: [replacement],
      activeBuffs: BUFFS,
    });

    expect(vacancies).toHaveLength(2);
    expect(vacancies.map((v) => v.bossId)).toEqual([1, 2]);
    expect(vacancies[0]).toMatchObject({
      characterId: 1,
      role: 'RANGED',
      lostBuffs: ['arcaneIntellect', 'bloodlust'],
    });
    expect(vacancies[0].replacements.map((r) => r.characterId)).toEqual([replacement.characterId]);
  });

  it('removes every withdrawn holder of a boss before computing lost buffs', () => {
    const mage1 = holder({ characterId: 1, userId: 'a', class: 'Mage' });
    const mage2 = holder({ characterId: 2, userId: 'b', class: 'Mage' });
    const vacancies = findVacancies({
      holders: [mage1, mage2],
      statusesByCharacterId: new Map([
        [1, ['ABSENT']],
        [2, ['ABSENT']],
      ]),
      candidates: [],
      activeBuffs: BUFFS,
    });
    expect(vacancies.map((v) => v.lostBuffs)).toEqual([
      ['arcaneIntellect', 'bloodlust'],
      ['arcaneIntellect', 'bloodlust'],
    ]);
  });

  it('reports nothing when every holder is still available', () => {
    expect(
      findVacancies({
        holders: [holder()],
        statusesByCharacterId: new Map([[1, ['PRESENT']]]),
        candidates: [candidate()],
        activeBuffs: BUFFS,
      }),
    ).toEqual([]);
  });
});

// Buffs réels du royaume (BUFF_PROVIDERS) et classes au format stocké en base
// (SIMS-219) : `mage`, `demon_hunter`.
describe('buffs with classes as stored in the database', () => {
  const REALM_BUFFS: ActiveBuff[] = resolveBuffs(null).filter((b) => b.enabled);

  it('lists the buffs lost by a leaving holder', () => {
    expect(lostBuffsOf('mage', ['priest', 'warrior'], REALM_BUFFS)).toEqual([
      'bloodlust',
      'arcaneIntellect',
    ]);
    expect(lostBuffsOf('demon_hunter', ['mage'], REALM_BUFFS)).toEqual(['chaosBrand']);
  });

  it('keeps a buff a remaining holder still provides', () => {
    expect(lostBuffsOf('mage', ['shaman'], REALM_BUFFS)).toEqual(['arcaneIntellect']);
  });

  it('still recognizes classes in the displayed format', () => {
    expect(lostBuffsOf('Demon Hunter', ['mage'], REALM_BUFFS)).toEqual(['chaosBrand']);
    expect(lostBuffsOf('demon_hunter', ['Demon Hunter'], REALM_BUFFS)).toEqual([]);
  });

  it('puts the replacement who brings the lost buff back first', () => {
    const needy = candidate({ class: 'warlock', needByBoss: need(1, 3) });
    const dh = candidate({
      class: 'demon_hunter',
      role: 'MELEE',
      playableRoles: ['MELEE'],
      needByBoss: need(1, 0),
    });
    const meleeNeedy = { ...needy, role: 'MELEE' as const, playableRoles: ['MELEE' as const] };
    const result = rankReplacements({
      vacancy: holder({ class: 'demon_hunter', role: 'MELEE' }),
      remaining: [{ characterId: 2, class: 'mage', userId: 'h2' }],
      candidates: [meleeNeedy, dh],
      activeBuffs: REALM_BUFFS,
    });
    expect(result[0]).toMatchObject({ characterId: dh.characterId, coveredBuffs: ['chaosBrand'] });
    expect(result[1].characterId).toBe(meleeNeedy.characterId);
  });
});

describe('needByBossOf', () => {
  it('counts BiS items that are upgrades and keeps the best gain', () => {
    const result = needByBossOf([
      {
        boss: { id: 7 },
        stats: { bestGain: 1234 },
        items: [
          { isBiS: true, isUpgrade: true },
          { isBiS: true, isUpgrade: false },
          { isBiS: false, isUpgrade: true },
        ],
      },
      { boss: { id: 8 }, stats: null, items: null },
    ]);
    expect(result.get(7)).toEqual({ bisCount: 1, bestGain: 1234 });
    expect(result.get(8)).toEqual({ bisCount: 0, bestGain: 0 });
  });
});
