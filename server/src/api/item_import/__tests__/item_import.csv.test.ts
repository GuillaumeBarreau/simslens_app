import { normalizeCsvRows } from '../item_import.csv';

describe('normalizeCsvRows', () => {
  it('leaves already split rows untouched', () => {
    const rows = [{ player: 'Bob-Hyjal', itemID: '123' }];
    expect(normalizeCsvRows(rows)).toBe(rows);
  });

  it('returns an empty list unchanged', () => {
    expect(normalizeCsvRows([])).toEqual([]);
  });

  it('splits rows collapsed into a single comma-separated column', () => {
    const rows = [{ 'player,itemID': 'Bob-Hyjal,123' }];
    expect(normalizeCsvRows(rows)).toEqual([{ player: 'Bob-Hyjal', itemID: '123' }]);
  });

  it('prefers a tab over a comma when both appear in the header', () => {
    const rows = [{ 'player\titem,ID': 'Bob\t123' }];
    expect(Object.keys(normalizeCsvRows(rows)[0])).toEqual(['player', 'item,ID']);
  });

  it('prefers a semicolon over a comma', () => {
    const rows = [{ 'player;item,ID': 'Bob;123' }];
    expect(Object.keys(normalizeCsvRows(rows)[0])).toEqual(['player', 'item,ID']);
  });

  it('trims the header names', () => {
    const rows = [{ ' player , itemID ': 'Bob,123' }];
    expect(Object.keys(normalizeCsvRows(rows)[0])).toEqual(['player', 'itemID']);
  });

  it('fills a missing trailing value with an empty string', () => {
    const rows = [{ 'player,itemID,response': 'Bob,123' }];
    expect(normalizeCsvRows(rows)[0].response).toBe('');
  });

  it('normalises every row, not just the first', () => {
    const rows = [{ 'player,itemID': 'Bob,1' }, { 'player,itemID': 'Alice,2' }];
    expect(normalizeCsvRows(rows)).toHaveLength(2);
    expect(normalizeCsvRows(rows)[1].player).toBe('Alice');
  });

  it('does not treat a single column without a comma as a header line', () => {
    const rows = [{ player: 'Bob' }];
    expect(normalizeCsvRows(rows)).toBe(rows);
  });
});
