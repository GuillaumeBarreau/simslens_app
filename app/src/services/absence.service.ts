import { apiClient } from './api.client';

export interface MemberAbsence {
  id: number;
  userId: string;
  realmId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAbsencePayload {
  realmId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateAbsencePayload {
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface AbsenceFilters {
  realmId: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

class AbsenceService {
  async getAll(filters: AbsenceFilters): Promise<MemberAbsence[]> {
    const params = new URLSearchParams();
    params.append('realmId', filters.realmId.toString());
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const { data } = await apiClient.get(`/1/absences?${params.toString()}`);
    return data.absences;
  }

  async getOne(id: number, realmId: number): Promise<MemberAbsence> {
    const { data } = await apiClient.get(`/1/absences/${id}?realmId=${realmId}`);
    return data.absence;
  }

  /**
   * Create a new absence
   * Note: userId is taken from auth on the server side
   */
  async create(payload: CreateAbsencePayload): Promise<MemberAbsence> {
    const { data } = await apiClient.post('/1/absences', payload);
    return data.absence;
  }

  async update(id: number, realmId: number, payload: UpdateAbsencePayload): Promise<MemberAbsence> {
    const { data } = await apiClient.put(`/1/absences/${id}?realmId=${realmId}`, payload);
    return data.absence;
  }

  async delete(id: number, realmId: number): Promise<MemberAbsence> {
    const { data } = await apiClient.delete(`/1/absences/${id}?realmId=${realmId}`);
    return data.absence;
  }
}

export const absenceService = new AbsenceService();
