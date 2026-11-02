import { ATTUNEMENTS } from '../attunement.definitions';
import { attunementStatus } from '../attunement.rules';

const drakefire = ATTUNEMENTS.drakefire_amulet;

describe('attunementStatus', () => {
  it('reads « not started » without any saved progress', () => {
    expect(attunementStatus(drakefire, null)).toEqual({
      attunement: 'drakefire_amulet',
      faction: null,
      completedSteps: 0,
      totalSteps: null,
      completed: false,
      nextStep: null,
    });
  });

  it('follows the chain of the faction', () => {
    const status = attunementStatus(drakefire, { faction: 'horde', completedSteps: 3 });
    expect(status.totalSteps).toBe(14);
    expect(status.completed).toBe(false);
    expect(status.nextStep).toEqual({ questId: 6566, name: 'What the Wind Carries' });
  });

  it('is complete after the last quest of the chain', () => {
    const status = attunementStatus(drakefire, { faction: 'alliance', completedSteps: 16 });
    expect(status).toMatchObject({ completed: true, totalSteps: 16, nextStep: null });
  });

  it('caps a stale count above the chain length', () => {
    const status = attunementStatus(drakefire, { faction: 'horde', completedSteps: 16 });
    expect(status).toMatchObject({ completedSteps: 14, completed: true });
  });

  it('has a non-empty chain for each faction', () => {
    expect(drakefire.chains.alliance.at(-1)?.questId).toBe(6502);
    expect(drakefire.chains.horde.at(-1)?.questId).toBe(6602);
  });
});
