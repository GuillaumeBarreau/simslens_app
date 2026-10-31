import type {
  AddDungeonGroupGuestPayload,
  CreateDungeonGroupPayload,
  DungeonGroup,
  DungeonGroupGuest,
  DungeonGroupMember,
  UpdateDungeonGroupPayload,
} from '../types/dungeon.types';
import { apiClient } from './api.client';

export type {
  AddDungeonGroupGuestPayload,
  CreateDungeonGroupPayload,
  DungeonGroup,
  DungeonGroupGuest,
  DungeonGroupMember,
  UpdateDungeonGroupPayload,
};

class DungeonGroupService {
  async getAll(
    realmId: number,
    date?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DungeonGroup[]> {
    const params = new URLSearchParams();
    params.append('realmId', realmId.toString());
    if (date) params.append('date', date);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const { data } = await apiClient.get(`/1/dungeon-groups?${params.toString()}`);
    return data.groups;
  }

  async getOne(id: number, realmId: number): Promise<DungeonGroup> {
    const { data } = await apiClient.get(`/1/dungeon-groups/${id}?realmId=${realmId}`);
    return data.group;
  }

  async create(payload: CreateDungeonGroupPayload): Promise<DungeonGroup> {
    const { data } = await apiClient.post('/1/dungeon-groups', payload);
    return data.group;
  }

  async update(
    id: number,
    realmId: number,
    payload: UpdateDungeonGroupPayload,
  ): Promise<DungeonGroup> {
    const { data } = await apiClient.put(`/1/dungeon-groups/${id}?realmId=${realmId}`, payload);
    return data.group;
  }

  async delete(id: number, realmId: number): Promise<void> {
    await apiClient.delete(`/1/dungeon-groups/${id}?realmId=${realmId}`);
  }

  async addMember(
    groupId: number,
    realmId: number,
    userId: string,
    role: string,
  ): Promise<DungeonGroup> {
    const { data } = await apiClient.post(
      `/1/dungeon-groups/${groupId}/members?realmId=${realmId}`,
      { userId, role },
    );
    return data.group;
  }

  async removeMember(groupId: number, realmId: number, userId: string): Promise<DungeonGroup> {
    const { data } = await apiClient.delete(
      `/1/dungeon-groups/${groupId}/members/${userId}?realmId=${realmId}`,
    );
    return data.group;
  }

  async addGuest(
    groupId: number,
    realmId: number,
    payload: AddDungeonGroupGuestPayload,
  ): Promise<DungeonGroup> {
    const { data } = await apiClient.post(
      `/1/dungeon-groups/${groupId}/guests?realmId=${realmId}`,
      payload,
    );
    return data.group;
  }

  async updateGuest(
    groupId: number,
    realmId: number,
    guestId: number,
    payload: { slotId: string | null },
  ): Promise<DungeonGroup> {
    const { data } = await apiClient.patch(
      `/1/dungeon-groups/${groupId}/guests/${guestId}?realmId=${realmId}`,
      payload,
    );
    return data.group;
  }

  async removeGuest(groupId: number, realmId: number, guestId: number): Promise<DungeonGroup> {
    const { data } = await apiClient.delete(
      `/1/dungeon-groups/${groupId}/guests/${guestId}?realmId=${realmId}`,
    );
    return data.group;
  }
}

export const dungeonGroupService = new DungeonGroupService();
