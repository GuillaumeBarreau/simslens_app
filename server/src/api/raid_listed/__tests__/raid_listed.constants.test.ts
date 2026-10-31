import {
  applyLegacyRaidDefaults,
  LEGACY_RAID_DEFAULTS,
  LEGACY_RAID_ID,
} from '../raid_listed.constants';

describe('applyLegacyRaidDefaults', () => {
  it('fills both fields for the legacy raid when neither is given', () => {
    expect(applyLegacyRaidDefaults(LEGACY_RAID_ID, {})).toEqual(LEGACY_RAID_DEFAULTS);
  });

  it('accepts the legacy raid id as a route string', () => {
    expect(applyLegacyRaidDefaults('1', {})).toEqual(LEGACY_RAID_DEFAULTS);
  });

  it('leaves explicit values untouched', () => {
    const given = { extension: 'Midnight', season: 'season-02' };
    expect(applyLegacyRaidDefaults(LEGACY_RAID_ID, given)).toEqual(given);
  });

  it('applies the defaults when only one of the two is given, as before', () => {
    expect(applyLegacyRaidDefaults(1, { extension: 'Midnight' })).toEqual(LEGACY_RAID_DEFAULTS);
  });

  it('returns the params untouched for any other raid', () => {
    expect(applyLegacyRaidDefaults(2, {})).toEqual({ extension: undefined, season: undefined });
  });

  it('tolerates a missing raidId and missing params', () => {
    expect(applyLegacyRaidDefaults(undefined)).toEqual({
      extension: undefined,
      season: undefined,
    });
  });

  it('does not treat a non-numeric raidId as the legacy raid', () => {
    expect(applyLegacyRaidDefaults('abc', {})).toEqual({
      extension: undefined,
      season: undefined,
    });
  });
});
