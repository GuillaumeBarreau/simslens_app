import { apiClient } from './api.client';

export type ActivityActionType = 'WISHLIST_UPDATE' | 'SIM_REPORT_UPLOAD' | 'EVENT_SIGNUP';

export interface WishlistUpdateMetadata {
  slot: string;
  characterId: number;
  specializationId?: number;
  oldItemId: number | null;
  newItemId: number | null;
  oldItemName?: string;
  newItemName?: string;
  oldItemQuality?: number | null;
  newItemQuality?: number | null;
  /** Legacy field — present on historical logs written before the difficulty drop */
  difficulty?: string;
}

export interface EventSignupMetadata {
  eventId: number;
  eventDate: string | null;
  status: string;
  oldStatus: string | null;
  role?: string;
}

export interface SimReportUploadMetadata {
  filename: string;
  rowCount: number;
  importID: number;
}

export interface ActivityLog {
  id: number;
  realmId: number;
  userId: string;
  characterName: string;
  actionType: ActivityActionType;
  metadata: WishlistUpdateMetadata | SimReportUploadMetadata | EventSignupMetadata | null;
  createdAt: string;
}

class HistoryService {
  async getLogs(realmId: number, limit = 100, characterName?: string): Promise<ActivityLog[]> {
    const params = new URLSearchParams({ realmId: String(realmId), limit: String(limit) });
    if (characterName) params.set('characterName', characterName);
    const { data } = await apiClient.get(`/1/activity?${params}`);
    return data.logs;
  }
}

export const historyService = new HistoryService();
