import { describe, expect, it } from 'vitest';

import { playerSimulatedSpecName, simulatedSpecName } from './index';

const ELEMENTAL = { id: 262, name: 'Elemental', role: 'ranged' };

describe('simulatedSpecName', () => {
  it('préfère la spé retenue par le serveur au libellé brut de la sim', () => {
    expect(simulatedSpecName({ simSpecialization: ELEMENTAL, spec: 'Elemental Shaman' })).toBe(
      'Elemental',
    );
  });

  it('se replie sur le libellé brut, sinon null', () => {
    expect(simulatedSpecName({ simSpecialization: null, spec: 'Elemental Shaman' })).toBe(
      'Elemental Shaman',
    );
    expect(simulatedSpecName({ spec: '' })).toBeNull();
    expect(simulatedSpecName(undefined)).toBeNull();
  });
});

describe('playerSimulatedSpecName', () => {
  const player = { id: 1, name: 'Thrall' };

  it('trouve la spé du joueur dans les lignes de n’importe quel objet', () => {
    const rows = {
      100: [{ characterId: 2, name: 'Jaina', simSpecialization: { id: 63, name: 'Fire' } }],
      101: [{ characterId: 1, name: 'Thrall', simSpecialization: ELEMENTAL }],
    };
    expect(playerSimulatedSpecName(rows, player)).toBe('Elemental');
  });

  it('ignore les lignes sans spé et renvoie null si le joueur n’en a aucune', () => {
    const rows = {
      100: [{ characterId: 1, name: 'Thrall', simSpecialization: null }],
      101: undefined,
    };
    expect(playerSimulatedSpecName(rows, player)).toBeNull();
  });
});
