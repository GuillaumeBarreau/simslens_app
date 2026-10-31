import type { activity_logs } from '@prisma/client';

export type ActivityLogEntity = activity_logs;

export interface ListRealmLogsInput {
  realmId: ActivityLogEntity['realmId'];
  limit?: number;
  characterName?: string | null;
}
