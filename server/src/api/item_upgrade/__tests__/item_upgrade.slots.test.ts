import { getPossibleSlots, INVENTORY_TYPE_TO_SLOT } from '../item_upgrade.slots';

describe('getPossibleSlots', () => {
  it.each([
    [1, ['head']],
    [2, ['neck']],
    [16, ['back']],
  ])('maps the unambiguous type %s', (type: number, expected: string[]) => {
    expect(getPossibleSlots(type)).toEqual(expected);
  });

  it('opens both ring slots', () => {
    expect(getPossibleSlots(11)).toEqual(['finger1', 'finger2']);
  });

  it('opens both trinket slots', () => {
    expect(getPossibleSlots(12)).toEqual(['trinket1', 'trinket2']);
  });

  it('lets a one-hand weapon go in either hand', () => {
    expect(getPossibleSlots(13)).toEqual(['main_hand', 'off_hand']);
  });

  it.each([15, 17, 21, 26])('keeps type %s in the main hand only', (type: number) => {
    expect(getPossibleSlots(type)).toEqual(['main_hand']);
  });

  it.each([14, 22, 23])('keeps type %s in the off hand only', (type: number) => {
    expect(getPossibleSlots(type)).toEqual(['off_hand']);
  });

  it.each([null, undefined, 0])('returns nothing for %s', (type: number | null | undefined) => {
    expect(getPossibleSlots(type)).toEqual([]);
  });

  it('returns nothing for an unknown type', () => {
    expect(getPossibleSlots(999)).toEqual([]);
  });

  it('returns a fresh array, never the shared constant', () => {
    const slots = getPossibleSlots(11);
    slots.push('mutated');
    expect(getPossibleSlots(11)).toEqual(['finger1', 'finger2']);
  });

  it('covers every entry of the single-slot table', () => {
    for (const [type, slot] of Object.entries(INVENTORY_TYPE_TO_SLOT)) {
      expect(getPossibleSlots(Number(type))).toContain(slot);
    }
  });
});
