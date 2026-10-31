import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SIMS-210 : rapprochement du libellé de spé d'une sim (Raidbots, QE) avec
 * `specializations`, dans la classe du personnage.
 */
const characterRepository = require('../../api/character/character.repository');
const {
  findSimSpecializationInClass,
  resolveSimSpecializationId,
  upgradePurgeWhere,
} = require('../simSpecialization');

const spec = (id, name, classId) => ({ id, name, classId, role: 'ranged' });

const CLASSES = {
  shaman: {
    id: 7,
    name: 'shaman',
    specializations: [
      spec(262, 'Elemental', 7),
      spec(263, 'Enhancement', 7),
      spec(264, 'Restoration', 7),
    ],
  },
  death_knight: {
    id: 6,
    name: 'death_knight',
    specializations: [spec(250, 'Blood', 6), spec(251, 'Frost', 6), spec(252, 'Unholy', 6)],
  },
  hunter: {
    id: 3,
    name: 'hunter',
    specializations: [spec(253, 'Beast Mastery', 3), spec(254, 'Marksmanship', 3)],
  },
};

describe('findSimSpecializationInClass', () => {
  it.each([
    ['Elemental Shaman', 'shaman', 262],
    ['Elemental', 'shaman', 262],
    ['  elemental SHAMAN ', 'shaman', 262],
    ['Frost Death Knight', 'death_knight', 251],
    ['frost death_knight', 'death_knight', 251],
    ['Beast Mastery Hunter', 'hunter', 253],
    ['beast_mastery', 'hunter', 253],
  ])('reconnaît « %s » (%s)', (label, cls, id) => {
    expect(findSimSpecializationInClass(CLASSES[cls], label)?.id).toBe(id);
  });

  it.each([
    ['Frost Mage', 'death_knight'],
    ['Fire', 'shaman'],
    ['Elemental Druid', 'shaman'],
    ['Élémentaire', 'shaman'],
    ['', 'shaman'],
    [null, 'shaman'],
  ])('ne reconnaît pas « %s » (%s)', (label, cls) => {
    expect(findSimSpecializationInClass(CLASSES[cls], label)).toBeNull();
  });
});

describe('resolveSimSpecializationId', () => {
  let findClass;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    findClass = vi
      .spyOn(characterRepository, 'findClassWithSpecializations')
      .mockImplementation(async (name) => CLASSES[name] ?? null);
  });

  it('cherche la spé dans la classe normalisée du personnage', async () => {
    await expect(resolveSimSpecializationId('Death Knight', 'Frost Death Knight')).resolves.toBe(
      251,
    );
    expect(findClass).toHaveBeenCalledWith('death_knight');
  });

  it("renvoie null pour une spé d'une autre classe", async () => {
    await expect(resolveSimSpecializationId('death_knight', 'Frost Mage')).resolves.toBeNull();
  });

  it('renvoie null pour une classe inconnue', async () => {
    await expect(resolveSimSpecializationId('barde', 'Elemental')).resolves.toBeNull();
  });

  it('renvoie null sans interroger la base quand le libellé est vide', async () => {
    await expect(resolveSimSpecializationId('shaman', '  ')).resolves.toBeNull();
    await expect(resolveSimSpecializationId('shaman', undefined)).resolves.toBeNull();
    expect(findClass).not.toHaveBeenCalled();
  });

  it('renvoie null au lieu de lever si la base échoue', async () => {
    findClass.mockRejectedValue(new Error('connexion perdue'));
    await expect(resolveSimSpecializationId('shaman', 'Elemental')).resolves.toBeNull();
  });
});

// SIMS-211 : purge des sims remplacées par un import.
describe('upgradePurgeWhere', () => {
  it('spé résolue : purge par specializationId et les lignes non rattachées du même libellé', () => {
    expect(
      upgradePurgeWhere({
        characterId: 31,
        difficulty: 'heroic',
        spec: ' Elemental Shaman ',
        specializationId: 262,
      }),
    ).toEqual({
      characterID: 31,
      difficulty: 'heroic',
      OR: [
        { specializationId: 262 },
        {
          specializationId: null,
          spec: { equals: 'Elemental Shaman', mode: 'insensitive' },
        },
      ],
    });
  });

  it('spé résolue sans libellé : purge par specializationId seul', () => {
    expect(
      upgradePurgeWhere({
        characterId: 31,
        difficulty: 'heroic',
        spec: null,
        specializationId: 262,
      }),
    ).toEqual({ characterID: 31, difficulty: 'heroic', OR: [{ specializationId: 262 }] });
  });

  it('spé non résolue : filtre historique sur le libellé exact', () => {
    expect(
      upgradePurgeWhere({
        characterId: 31,
        difficulty: 'mythic',
        spec: 'Fire Mage',
        specializationId: null,
      }),
    ).toEqual({ characterID: 31, difficulty: 'mythic', spec: 'Fire Mage' });
    expect(
      upgradePurgeWhere({
        characterId: 31,
        difficulty: 'mythic',
        spec: null,
        specializationId: null,
      }),
    ).toEqual({ characterID: 31, difficulty: 'mythic' });
  });
});
