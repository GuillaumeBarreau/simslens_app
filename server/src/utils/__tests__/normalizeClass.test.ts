import { normalizeClass as sharedNormalizeClass } from '../../shared/utils/normalizeClass';
import { normalizeClass } from '../normalizeClass';

describe('normalizeClass', () => {
  it.each([
    ['Death Knight', 'death_knight'],
    ['Demon Hunter', 'demon_hunter'],
    ['  Mage ', 'mage'],
    ['death_knight', 'death_knight'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeClass(input)).toBe(expected);
  });

  it('returns an empty string for a missing class', () => {
    expect(normalizeClass(null)).toBe('');
    expect(normalizeClass(undefined)).toBe('');
    expect(normalizeClass('')).toBe('');
  });

  it('is the implementation shared with the CommonJS modules', () => {
    expect(normalizeClass).toBe(sharedNormalizeClass);
  });
});
