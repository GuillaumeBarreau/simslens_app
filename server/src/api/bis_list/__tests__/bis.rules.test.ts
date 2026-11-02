import { rankItems, resolveBisSlots } from '../bis.rules';
import type { GuildBisEntry, ReferenceBisList } from '../bis.types';

const entry = (season: string, slot: string, rank: number, itemId: number): GuildBisEntry => ({
  season,
  slot,
  rank,
  itemId,
  note: null,
});

const reference = (season: string, slots: ReferenceBisList['slots']): ReferenceBisList => ({
  className: 'warrior',
  specName: 'Protection',
  season,
  slots,
  sources: ['https://example.test'],
});

describe('resolveBisSlots', () => {
  it('prefers the guild list over the reference for the same tier', () => {
    const [head] = resolveBisSlots(
      ['head'],
      ['tier-1'],
      [entry('tier-1', 'head', 1, 200)],
      [reference('tier-1', { head: [{ itemId: 100, note: null }] })],
    );
    expect(head).toEqual({
      slot: 'head',
      source: 'guild',
      season: 'tier-1',
      items: [{ itemId: 200, note: null }],
    });
  });

  it('falls back to the reference when the guild has no list', () => {
    const [head] = resolveBisSlots(
      ['head'],
      ['tier-1'],
      [],
      [reference('tier-1', { head: [{ itemId: 100, note: 'tank' }] })],
    );
    expect(head).toMatchObject({ source: 'curated', items: [{ itemId: 100, note: 'tank' }] });
  });

  it('keeps the list of an earlier tier when the current one has none (cumulative)', () => {
    const [neck] = resolveBisSlots(
      ['neck'],
      ['tier-1', 'tier-2'],
      [entry('tier-1', 'neck', 1, 300)],
      [],
    );
    expect(neck).toMatchObject({ source: 'guild', season: 'tier-1', items: [{ itemId: 300 }] });
  });

  it('a newer reference wins over an older guild list', () => {
    const [neck] = resolveBisSlots(
      ['neck'],
      ['tier-1', 'tier-2'],
      [entry('tier-1', 'neck', 1, 300)],
      [reference('tier-2', { neck: [{ itemId: 400, note: null }] })],
    );
    expect(neck).toMatchObject({ source: 'curated', season: 'tier-2' });
  });

  it('orders guild items by rank', () => {
    const [head] = resolveBisSlots(
      ['head'],
      ['tier-1'],
      [entry('tier-1', 'head', 2, 22), entry('tier-1', 'head', 1, 11)],
      [],
    );
    expect(head.items.map((i) => i.itemId)).toEqual([11, 22]);
  });

  it('returns an empty slot without any list', () => {
    expect(resolveBisSlots(['feet'], ['tier-1'], [], [])).toEqual([
      { slot: 'feet', source: null, season: null, items: [] },
    ]);
  });
});

describe('rankItems', () => {
  it('ranks items in the given order, starting at 1', () => {
    expect(rankItems([{ itemId: 5 }, { itemId: 6, note: 'alt' }])).toEqual([
      { itemId: 5, note: null, rank: 1 },
      { itemId: 6, note: 'alt', rank: 2 },
    ]);
  });
});
