import { UnrecoverableError } from 'bullmq';
import { describe, expect, it } from 'vitest';

/**
 * SIMS-202 : une sim QE Live est rattachée à une spé de soin du personnage, ou
 * l'import est refusé avec un code d'erreur stable.
 */

const { ReportImportError, pickQEHealerSpecialization } = require('../qeHealerSpecialization');

const PRIEST = {
  name: 'priest',
  specializations: [
    { id: 256, name: 'Discipline', role: 'healer' },
    { id: 257, name: 'Holy', role: 'healer' },
    { id: 258, name: 'Shadow', role: 'ranged' },
  ],
};

const SHAMAN = {
  name: 'shaman',
  specializations: [
    { id: 262, name: 'Elemental', role: 'ranged' },
    { id: 263, name: 'Enhancement', role: 'melee' },
    { id: 264, name: 'Restoration', role: 'healer' },
  ],
};

const WARRIOR = {
  name: 'warrior',
  specializations: [
    { id: 71, name: 'Arms', role: 'melee' },
    { id: 72, name: 'Fury', role: 'melee' },
    { id: 73, name: 'Protection', role: 'tank' },
  ],
};

function refusalOf(params) {
  try {
    pickQEHealerSpecialization(params);
  } catch (err) {
    return err;
  }
  throw new Error('aucun refus');
}

describe('pickQEHealerSpecialization — spé du rapport reconnue', () => {
  it('retient la spé de soin du rapport pour un personnage sans spé déclarée', () => {
    expect(
      pickQEHealerSpecialization({ characterClass: SHAMAN, simSpec: 'Restoration Shaman' }),
    ).toMatchObject({ id: 264 });
  });

  it('retient la spé de soin principale', () => {
    expect(
      pickQEHealerSpecialization({
        characterClass: PRIEST,
        simSpec: 'Holy Priest',
        mainSpecializationId: 257,
      }),
    ).toMatchObject({ id: 257 });
  });

  it('retient une off-spec de soin quand la spé principale est DPS', () => {
    expect(
      pickQEHealerSpecialization({
        characterClass: SHAMAN,
        simSpec: 'restoration',
        mainSpecializationId: 262,
        offSpecializationIds: [264],
      }),
    ).toMatchObject({ id: 264 });
  });

  it('refuse une spé du rapport qui n’est pas un soin (QE_NOT_HEALER_SPEC)', () => {
    const err = refusalOf({ characterClass: SHAMAN, simSpec: 'Elemental Shaman' });
    expect(err).toBeInstanceOf(ReportImportError);
    expect(err.code).toBe('QE_NOT_HEALER_SPEC');
  });

  it('retient une spé de soin de la classe même non déclarée (prêtre Ombre, QE Sacré)', () => {
    expect(
      pickQEHealerSpecialization({
        characterClass: PRIEST,
        simSpec: 'Holy Priest',
        mainSpecializationId: 258,
        offSpecializationIds: [],
      }),
    ).toMatchObject({ id: 257 });
    expect(
      pickQEHealerSpecialization({
        characterClass: PRIEST,
        simSpec: 'Discipline Priest',
        mainSpecializationId: 258,
        offSpecializationIds: [257],
      }),
    ).toMatchObject({ id: 256 });
  });
});

describe('pickQEHealerSpecialization — spé du rapport absente ou inconnue', () => {
  it('se rabat sur la spé principale si c’est un soin', () => {
    expect(
      pickQEHealerSpecialization({
        characterClass: PRIEST,
        simSpec: '',
        mainSpecializationId: 256,
        offSpecializationIds: [257],
      }),
    ).toMatchObject({ id: 256 });
  });

  it('se rabat sur la première off-spec de soin si la principale est DPS', () => {
    expect(
      pickQEHealerSpecialization({
        characterClass: PRIEST,
        simSpec: 'Inconnue',
        mainSpecializationId: 258,
        offSpecializationIds: [257],
      }),
    ).toMatchObject({ id: 257 });
  });

  it('retient l’unique spé de soin de la classe', () => {
    expect(pickQEHealerSpecialization({ characterClass: SHAMAN, simSpec: null })).toMatchObject({
      id: 264,
    });
    // Même avec une spé principale DPS et une off-spec DPS déclarées.
    expect(
      pickQEHealerSpecialization({
        characterClass: SHAMAN,
        simSpec: undefined,
        mainSpecializationId: 262,
        offSpecializationIds: [263],
      }),
    ).toMatchObject({ id: 264 });
  });

  it('refuse quand plusieurs spés de soin sont possibles et aucune n’est déductible', () => {
    expect(refusalOf({ characterClass: PRIEST, simSpec: null }).code).toBe('QE_NO_HEALER_SPEC');
    const err = refusalOf({
      characterClass: PRIEST,
      simSpec: 'Inconnue',
      mainSpecializationId: 258,
      offSpecializationIds: [],
    });
    expect(err.code).toBe('QE_NO_HEALER_SPEC');
  });
});

describe('pickQEHealerSpecialization — cas limites', () => {
  it('refuse une classe sans spé de soin, même avec un libellé de soin', () => {
    expect(refusalOf({ characterClass: WARRIOR, simSpec: 'Restoration Shaman' }).code).toBe(
      'QE_NO_HEALER_SPEC',
    );
  });

  it('renvoie null sans rien vérifier quand la classe est inconnue', () => {
    expect(
      pickQEHealerSpecialization({ characterClass: null, simSpec: 'Restoration Shaman' }),
    ).toBeNull();
  });

  it('un refus n’est pas relancé par BullMQ', () => {
    expect(refusalOf({ characterClass: WARRIOR, simSpec: null })).toBeInstanceOf(
      UnrecoverableError,
    );
  });
});
