import type {
  CreateDungeonAvailabilityPayload,
  DungeonAvailability,
  DungeonAvailabilityFilters,
  UpdateDungeonAvailabilityPayload,
} from '../types/dungeon.types';
import { apiClient } from './api.client';

export type {
  CreateDungeonAvailabilityPayload,
  DungeonAvailability,
  DungeonAvailabilityFilters,
  UpdateDungeonAvailabilityPayload,
};

class DungeonAvailabilityService {
  async getAll(filters: DungeonAvailabilityFilters): Promise<DungeonAvailability[]> {
    const params = new URLSearchParams();
    params.append('realmId', filters.realmId.toString());
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const { data } = await apiClient.get(`/1/dungeon-availability?${params.toString()}`);
    return data.availabilities;
  }

  async getOne(id: number, realmId: number): Promise<DungeonAvailability> {
    const { data } = await apiClient.get(`/1/dungeon-availability/${id}?realmId=${realmId}`);
    return data.availability;
  }

  async create(payload: CreateDungeonAvailabilityPayload): Promise<DungeonAvailability> {
    const { data } = await apiClient.post('/1/dungeon-availability', payload);
    return data.availability;
  }

  async update(
    id: number,
    realmId: number,
    payload: UpdateDungeonAvailabilityPayload,
  ): Promise<DungeonAvailability> {
    const { data } = await apiClient.put(
      `/1/dungeon-availability/${id}?realmId=${realmId}`,
      payload,
    );
    return data.availability;
  }

  async delete(id: number, realmId: number): Promise<DungeonAvailability> {
    const { data } = await apiClient.delete(`/1/dungeon-availability/${id}?realmId=${realmId}`);
    return data.availability;
  }
}

export const dungeonAvailabilityService = new DungeonAvailabilityService();
