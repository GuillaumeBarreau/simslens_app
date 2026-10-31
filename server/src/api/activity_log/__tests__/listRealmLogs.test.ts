import { DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT } from '../activity_log.constants';
import { listRealmLogs } from '../usecases/listRealmLogs';

const getLogsByRealm = vi.fn().mockResolvedValue([]);

vi.mock('../activity_log.repository', () => ({
  default: { getLogsByRealm: (...args: unknown[]) => getLogsByRealm(...args) },
}));

describe('listRealmLogs', () => {
  beforeEach(() => {
    getLogsByRealm.mockClear();
  });

  it('applies the default limit when none is given', async () => {
    await listRealmLogs({ realmId: 1 });
    expect(getLogsByRealm).toHaveBeenCalledWith(1, DEFAULT_LOG_LIMIT, null, null);
  });

  it('caps a limit above the maximum instead of rejecting it', async () => {
    await listRealmLogs({ realmId: 1, limit: 10_000 });
    expect(getLogsByRealm).toHaveBeenCalledWith(1, MAX_LOG_LIMIT, null, null);
  });

  it('passes through a limit inside the allowed range', async () => {
    await listRealmLogs({ realmId: 2, limit: 25 });
    expect(getLogsByRealm).toHaveBeenCalledWith(2, 25, null, null);
  });

  it('forwards the character filter', async () => {
    await listRealmLogs({ realmId: 3, characterName: 'Bob' });
    expect(getLogsByRealm).toHaveBeenCalledWith(3, DEFAULT_LOG_LIMIT, 'Bob', null);
  });

  it('returns whatever the repository yields', async () => {
    const rows = [{ id: 1 }];
    getLogsByRealm.mockResolvedValueOnce(rows);
    await expect(listRealmLogs({ realmId: 1 })).resolves.toBe(rows);
  });
});
