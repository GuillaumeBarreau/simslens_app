// Namespace Blizzard centralisé (SIMS-020).
import { blizzardNamespace } from '../blizzardNamespace';

describe('blizzardNamespace', () => {
  it.each([
    ['profile', 'eu', 'profile-eu'],
    ['static', 'eu', 'static-eu'],
    ['dynamic', 'eu', 'dynamic-eu'],
    ['profile', 'us', 'profile-us'],
    ['static', 'kr', 'static-kr'],
  ] as const)('builds %s for %s as on retail today', (kind, region, expected) => {
    expect(blizzardNamespace(kind, region)).toBe(expected);
    expect(blizzardNamespace(kind, region, 'retail')).toBe(expected);
  });

  it('keeps the region as given (callers normalise it)', () => {
    expect(blizzardNamespace('profile', 'EU')).toBe('profile-EU');
  });

  it.each(['profile', 'static', 'dynamic'] as const)(
    'returns null for forever (%s): no Blizzard API yet',
    (kind) => {
      expect(blizzardNamespace(kind, 'eu', 'forever')).toBeNull();
    },
  );
});
