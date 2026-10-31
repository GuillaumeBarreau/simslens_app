import type { ReplacementCandidate } from '../roster.replacements';
import { needByBossOf, rankReplacements } from '../roster.replacements';

/**
 * SIMS-202 : un gain brut de soigneur importé de QE Live est en HPS. Pour
 * départager des remplaçants, il n'est jamais comparé tel quel à un gain DPS.
 */

const healer = (
  characterId: number,
  bestGain: number,
  metric: 'dps' | 'hps' | null,
): ReplacementCandidate => ({
  characterId,
  name: `H${characterId}`,
  class: 'Priest',
  spec: 'Holy',
  userId: `u${characterId}`,
  role: 'HEALER',
  playableRoles: ['HEALER'],
  needByBoss: new Map([[1, { bisCount: 0, bestGain, ...(metric ? { metric } : {}) }]]),
});

const VACANCY = { bossId: 1, class: 'Druid', role: 'HEALER' as const };

describe('rankReplacements — gains HPS et DPS', () => {
  it('ne laisse pas un gain DPS brut écraser le meilleur gain HPS', () => {
    // H1 : meilleur soigneur simulé en HPS ; H3 : gain DPS brut plus grand.
    const ranked = rankReplacements({
      vacancy: VACANCY,
      remaining: [],
      candidates: [healer(1, 900, 'hps'), healer(2, 300, 'hps'), healer(3, 5000, 'dps')],
      activeBuffs: [],
      limit: 3,
    });
    // Comparés bruts, H3 (5000 DPS) passerait devant H1 (900 HPS). Chaque gain
    // est ramené à l'échelle de sa grandeur : H1 est le meilleur des HPS, H3
    // seul de sa grandeur ne prend aucun avantage ; H2 et H3 se départagent
    // par le nom.
    expect(ranked.map((r) => r.characterId)).toEqual([1, 2, 3]);
    expect(ranked.find((r) => r.characterId === 1)?.metric).toBe('hps');
    expect(ranked.find((r) => r.characterId === 3)?.metric).toBe('dps');
  });

  it('entre gains de même grandeur, le plus grand l’emporte (inchangé)', () => {
    const ranked = rankReplacements({
      vacancy: VACANCY,
      remaining: [],
      candidates: [healer(4, 100, null), healer(5, 400, null)],
      activeBuffs: [],
    });
    expect(ranked.map((r) => r.characterId)).toEqual([5, 4]);
    expect(ranked[0].metric).toBe('dps');
  });
});

describe('needByBossOf — grandeur', () => {
  it('reprend la grandeur des stats de la vue par boss', () => {
    const result = needByBossOf([
      { boss: { id: 7 }, stats: { bestGain: 50, metric: 'hps' }, items: [] },
    ]);
    expect(result.get(7)).toEqual({ bisCount: 0, bestGain: 50, metric: 'hps' });
  });
});
