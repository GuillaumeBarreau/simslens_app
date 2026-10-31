import { characterKey, parseNameRealm } from '../importUtils';

describe('characterKey', () => {
  it('lowercases both parts', () => {
    expect(characterKey('Bob', 'Hyjal')).toBe('bob|hyjal');
  });

  it('is stable whatever the casing of the input', () => {
    expect(characterKey('BOB', 'HYJAL')).toBe(characterKey('bob', 'hyjal'));
  });

  it('keeps the two parts separable', () => {
    expect(characterKey('Bob', 'Hyjal').split('|')).toEqual(['bob', 'hyjal']);
  });

  it('tolerates non-string input', () => {
    expect(characterKey(1 as unknown as string, 2 as unknown as string)).toBe('1|2');
  });

  it('matches what parseNameRealm produces', () => {
    const { name, realm } = parseNameRealm('Bob-Hyjal');
    expect(characterKey(name, realm)).toBe('bob|hyjal');
  });
});
