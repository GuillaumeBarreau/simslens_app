import type { AttunementStatus, CharacterAttunements } from 'services/attunement.service';

import {
  countReady,
  progressOf,
  sortByProgress,
  stepsAfterToggle,
  wowheadQuestUrl,
} from './attunementView';

const KEY = 'drakefire_amulet';

const character = (
  characterId: number,
  name: string,
  status: Partial<AttunementStatus> | null,
): CharacterAttunements => ({
  characterId,
  name,
  class: 'mage',
  attunements: status
    ? [
        {
          attunement: KEY,
          faction: 'horde',
          completedSteps: 0,
          totalSteps: 14,
          completed: false,
          nextStep: null,
          ...status,
        },
      ]
    : [],
});

describe('wowheadQuestUrl', () => {
  it('pointe vers Wowhead Forever par défaut', () => {
    expect(wowheadQuestUrl(6502)).toBe('https://www.wowhead.com/forever/quest=6502');
  });

  it('suit la base Wowhead du jeu', () => {
    expect(wowheadQuestUrl(4182, 'https://www.wowhead.com/')).toBe(
      'https://www.wowhead.com/quest=4182',
    );
  });
});

describe('progressOf', () => {
  it('vaut -1 sans faction choisie', () => {
    expect(progressOf(undefined)).toBe(-1);
    expect(progressOf(character(1, 'A', { faction: null, totalSteps: null }).attunements[0])).toBe(
      -1,
    );
  });

  it('rapporte les quêtes faites à la longueur de la chaîne', () => {
    expect(progressOf(character(1, 'A', { completedSteps: 7 }).attunements[0])).toBe(0.5);
  });
});

describe('sortByProgress', () => {
  it('place les plus avancés en tête, sans faction en dernier, puis par nom', () => {
    const roster = [
      character(1, 'Zed', null),
      character(2, 'Bob', { completedSteps: 3 }),
      character(3, 'Ana', { completedSteps: 14, completed: true }),
      character(4, 'Al', { completedSteps: 3 }),
    ];
    expect(sortByProgress(roster, KEY).map((c) => c.name)).toEqual(['Ana', 'Al', 'Bob', 'Zed']);
  });

  it('ne modifie pas la liste reçue', () => {
    const roster = [character(1, 'B', null), character(2, 'A', { completedSteps: 1 })];
    sortByProgress(roster, KEY);
    expect(roster.map((c) => c.name)).toEqual(['B', 'A']);
  });
});

describe('countReady', () => {
  it('compte les personnages prêts sur le total du roster', () => {
    const roster = [
      character(1, 'A', { completed: true, completedSteps: 14 }),
      character(2, 'B', { completedSteps: 4 }),
      character(3, 'C', null),
    ];
    expect(countReady(roster, KEY)).toEqual({ ready: 1, total: 3 });
  });

  it('ignore les autres attunements', () => {
    expect(countReady([character(1, 'A', { completed: true })], 'other')).toEqual({
      ready: 0,
      total: 1,
    });
  });
});

describe('stepsAfterToggle', () => {
  it('cocher une quête valide aussi les précédentes', () => {
    expect(stepsAfterToggle(4, true)).toBe(5);
  });

  it('décocher une quête annule aussi les suivantes', () => {
    expect(stepsAfterToggle(4, false)).toBe(4);
  });
});
