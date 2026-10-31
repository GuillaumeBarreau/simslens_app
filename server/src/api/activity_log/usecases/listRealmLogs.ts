import { resolveLimit } from '../activity_log.constants';
import activityLogRepo from '../activity_log.repository';
import type { ActivityLogEntity, ListRealmLogsInput } from '../activity_log.types';

export async function listRealmLogs({
  realmId,
  limit,
  characterName = null,
}: ListRealmLogsInput): Promise<ActivityLogEntity[]> {
  return activityLogRepo.getLogsByRealm(realmId, resolveLimit(limit), characterName, null);
}
