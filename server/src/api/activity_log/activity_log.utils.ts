const activityLogRepo = require('./activity_log.repository');

export interface SimReportUploadLogParams {
  realmId: number;
  userId: string;
  filename: string;
  rowCount: number;
  importID: string;
}

export function logSimReportUpload({
  realmId,
  userId,
  filename,
  rowCount,
  importID,
}: SimReportUploadLogParams): void {
  activityLogRepo
    .createLog({
      realmId,
      userId,
      characterName: filename,
      actionType: 'SIM_REPORT_UPLOAD',
      metadata: { filename, rowCount, importID },
    })
    .catch((err: Error) => console.error('[ActivityLog] Failed to log SIM_REPORT_UPLOAD:', err));
}

export interface EventSignupLogParams {
  realmId: number;
  userId: string;
  characterName: string;
  eventId: number;
  eventDate: string | null;
  status: string;
  oldStatus: string | null;
  /** Une inscription peut ne porter aucun rôle (colonne nullable). */
  role?: string | null;
}

export function logEventSignup({
  realmId,
  userId,
  characterName,
  eventId,
  eventDate,
  status,
  oldStatus,
  role,
}: EventSignupLogParams): void {
  activityLogRepo
    .createLog({
      realmId,
      userId,
      characterName,
      actionType: 'EVENT_SIGNUP',
      metadata: { eventId, eventDate, status, oldStatus, role },
    })
    .catch((err: Error) => console.error('[ActivityLog] Failed to log EVENT_SIGNUP:', err));
}

export interface WishlistUpdateLogParams {
  realmId: number | null;
  userId: string;
  characterName: string;
  slot: string;
  characterId: number;
  specializationId: number;
  oldItemId: number | null;
  newItemId: number | null;
}

export function logWishlistUpdate({
  realmId,
  userId,
  characterName,
  slot,
  characterId,
  specializationId,
  oldItemId,
  newItemId,
}: WishlistUpdateLogParams): void {
  if (!realmId) return;
  activityLogRepo
    .createLog({
      realmId,
      userId,
      characterName,
      actionType: 'WISHLIST_UPDATE',
      metadata: { slot, characterId, specializationId, oldItemId, newItemId },
    })
    .catch((err: Error) => console.error('[ActivityLog] Failed to log WISHLIST_UPDATE:', err));
}
