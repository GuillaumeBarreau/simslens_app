// Optimiseur de loot (SIMS-234) : une seule spé par personnage dans les vues
// multi-personnages, choisie comme dans la vue par boss (SIMS-211).

import {
  type BatchCharacter,
  keepRetainedSpecUpgrades,
  keepRetainedSpecWishes,
  latestRetainedUpgradeByCharacterItem,
  resolveRetainedSpecializations,
  withWishlistFallback,
} from '../item_upgrade.batchSpecialization';

const SHAMAN = {
  name: 'shaman',
  specializations: [
    { id: 262, name: 'Elemental', icon: 'ele.jpg', role: 'ranged' },
    { id: 264, name: 'Restoration', icon: 'resto.jpg', role: 'healer' },
  ],
};

function character(overrides: Partial<BatchCharacter> = {}): BatchCharacter {
  return { id: 1, specializationId: 262, characterClass: SHAMAN, ...overrides };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    characterID: 1,
    itemID: 100,
    dps: 1100,
    baseDps: 1000,
    spec: 'Elemental Shaman',
    specializationId: 262 as number | null,
    timeStamp: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

describe('resolveRetainedSpecializations', () => {
  it('retient la spé principale par défaut, même si une autre spé est plus récente', () => {
    const retained = resolveRetainedSpecializations({
      characters: [character()],
      sims: [
        {
          characterID: 1,
          spec: 'Restoration Shaman',
          specializationId: 264,
          timeStamp: '2026-10-05',
        },
        {
          characterID: 1,
          spec: 'Elemental Shaman',
          specializationId: 262,
          timeStamp: '2026-10-01',
        },
      ],
    });
    expect(retained.get(1)).toMatchObject({
      specializationId: 262,
      specialization: { id: 262, name: 'Elemental', role: 'ranged' },
    });
  });

  it('sans spé principale, retient la dernière spé simulée (libellé compris)', () => {
    const retained = resolveRetainedSpecializations({
      characters: [character({ specializationId: null })],
      sims: [
        {
          characterID: 1,
          spec: 'Elemental Shaman',
          specializationId: 262,
          timeStamp: '2026-10-01',
        },
        // Ligne non rattachée : spé reconnue par son libellé.
        { characterID: 1, spec: 'restoration', specializationId: null, timeStamp: '2026-10-05' },
      ],
    });
    expect(retained.get(1)?.specializationId).toBe(264);
  });

  it('sans spé principale ni sim reconnue, ne retient aucune spé', () => {
    const retained = resolveRetainedSpecializations({
      characters: [character({ specializationId: null })],
      sims: [{ characterID: 1, spec: 'Fire Mage', specializationId: null, timeStamp: null }],
    });
    expect(retained.get(1)).toMatchObject({ specializationId: null, specialization: null });
  });
});

describe('keepRetainedSpecUpgrades', () => {
  it('deux sims de spés différentes sur le même objet ne se mélangent pas', () => {
    const retained = resolveRetainedSpecializations({ characters: [character()], sims: [] });
    const ele = row();
    const resto = row({ spec: 'Restoration Shaman', specializationId: 264, dps: 5000 });
    expect(keepRetainedSpecUpgrades([resto, ele], retained)).toEqual([ele]);
  });

  it('rattache une ligne sans specializationId par son libellé', () => {
    const retained = resolveRetainedSpecializations({ characters: [character()], sims: [] });
    const legacyEle = row({ spec: 'elemental', specializationId: null });
    const legacyResto = row({ spec: 'Restoration Shaman', specializationId: null });
    expect(keepRetainedSpecUpgrades([legacyEle, legacyResto], retained)).toEqual([legacyEle]);
  });

  it('garde la spé de chaque personnage et écarte un personnage inconnu', () => {
    const retained = resolveRetainedSpecializations({
      characters: [character(), character({ id: 2, specializationId: 264 })],
      sims: [],
    });
    const a = row();
    const b = row({ characterID: 2, spec: 'Restoration Shaman', specializationId: 264 });
    const bWrong = row({ characterID: 2 });
    const unknown = row({ characterID: 3 });
    expect(keepRetainedSpecUpgrades([a, b, bWrong, unknown], retained)).toEqual([a, b]);
  });
});

describe('latestRetainedUpgradeByCharacterItem', () => {
  it('garde la sim la plus récente de la spé retenue, pas celle d’une autre spé', () => {
    const retained = resolveRetainedSpecializations({ characters: [character()], sims: [] });
    const old = row({ timeStamp: '2026-09-01T00:00:00Z', dps: 1500 });
    const recent = row({ timeStamp: '2026-10-01T00:00:00Z' });
    const otherSpec = row({ specializationId: 264, timeStamp: '2026-10-09T00:00:00Z', dps: 9000 });
    const map = latestRetainedUpgradeByCharacterItem([old, otherSpec, recent], retained);
    expect([...map.entries()]).toEqual([['1-100', recent]]);
  });
});

describe('vœux de la wishlist', () => {
  const wish = (overrides: Record<string, unknown> = {}) => ({
    characterId: 1,
    specializationId: 262,
    itemId: 100,
    slot: 'main_hand',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  });

  it('ne garde que les vœux de la spé retenue, un par objet', () => {
    const retained = resolveRetainedSpecializations({ characters: [character()], sims: [] });
    const ele = wish();
    const eleOtherSlot = wish({ slot: 'off_hand' });
    const resto = wish({ specializationId: 264 });
    expect(keepRetainedSpecWishes([resto, ele, eleOtherSlot], retained)).toEqual([ele]);
  });

  it('sans spé retenue, se replie sur la spé du vœu modifié le plus récemment', () => {
    const base = resolveRetainedSpecializations({
      characters: [character({ specializationId: null })],
      sims: [],
    });
    const ele = wish({ updatedAt: '2026-09-01T00:00:00Z' });
    const resto = wish({ specializationId: 264, updatedAt: '2026-10-01T00:00:00Z' });
    const retained = withWishlistFallback(base, [ele, resto]);
    expect(retained.get(1)).toMatchObject({
      specializationId: 264,
      specialization: { name: 'Restoration' },
    });
    expect(keepRetainedSpecWishes([ele, resto], retained)).toEqual([resto]);
    // La table d'origine n'est pas modifiée.
    expect(base.get(1)?.specializationId).toBeNull();
  });

  it('le repli ne remplace pas une spé déjà retenue', () => {
    const base = resolveRetainedSpecializations({ characters: [character()], sims: [] });
    const retained = withWishlistFallback(base, [wish({ specializationId: 264 })]);
    expect(retained.get(1)?.specializationId).toBe(262);
  });
});
