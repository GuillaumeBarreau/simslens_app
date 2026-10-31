import { apiClient } from './api.client';

export interface RaidGuest {
  id: number;
  eventId: number;
  realmId: number;
  name: string;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
  class?: string;
  addedBy?: string;
  createdAt: string;
}

export interface RaidEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  raidDifficultyId?: number;
  realmId: number;
  discordEventId?: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isOptional?: boolean;
  defaultPresent?: boolean;
  signupLockDisabled?: boolean;
  /** Série récurrente d'origine (SIMS-200). */
  seriesId?: number | null;
  /** Date de l'occurrence dans sa série, même si le raid a été déplacé. */
  seriesOccurrenceDate?: string | null;
  raid_difficulty?: {
    raid: { id: number; name: string; extension: string; season: string };
    difficulty_rel: { name: string };
  };
  signups?: RaidSignup[];
  guests?: RaidGuest[];
  roster?: {
    tanks: RaidSignup[];
    healers: RaidSignup[];
    dps: RaidSignup[];
  };
}

export interface RaidSignup {
  id: number;
  eventId: number;
  characterId: number;
  status: 'PRESENT' | 'ABSENT' | 'TENTATIVE' | 'BENCH' | 'LATE';
  role?: string;
  lateTime?: string;
  absenceReason?: string;
  createdAt: string;
  updatedAt: string;
  character?: {
    id: number;
    name: string;
    class: string;
    spec?: string;
    thumbnail?: string;
    userId?: string;
  };
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  raidDifficultyId?: number;
  realmId: number;
  isOptional?: boolean;
  defaultPresent?: boolean;
  signupLockDisabled?: boolean;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  raidDifficultyId?: number;
  status?: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  isOptional?: boolean;
  signupLockDisabled?: boolean;
}

export interface EventFilters {
  realmId: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

class EventService {
  async getAll(filters: EventFilters): Promise<RaidEvent[]> {
    const params = new URLSearchParams();
    params.append('realmId', filters.realmId.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status) params.append('status', filters.status);

    const { data } = await apiClient.get(`/1/events?${params.toString()}`);
    return data.events;
  }

  async getOne(id: number, realmId: number): Promise<RaidEvent> {
    const { data } = await apiClient.get(`/1/events/${id}?realmId=${realmId}`);
    return data.event;
  }

  async create(payload: CreateEventPayload): Promise<RaidEvent> {
    const { data } = await apiClient.post(`/1/events?realmId=${payload.realmId}`, payload);
    return data.event;
  }

  async update(id: number, realmId: number, payload: UpdateEventPayload): Promise<RaidEvent> {
    const { data } = await apiClient.put(`/1/events/${id}?realmId=${realmId}`, payload);
    return data.event;
  }

  async delete(id: number, realmId: number): Promise<void> {
    await apiClient.delete(`/1/events/${id}?realmId=${realmId}`);
  }

  async duplicate(
    id: number,
    realmId: number,
    options: { title?: string; copySignups: boolean },
  ): Promise<RaidEvent> {
    const { data } = await apiClient.post(`/1/events/${id}/duplicate?realmId=${realmId}`, options);
    return data.event;
  }

  /**
   * Cancel an event (Deprecated, use delete)
   */
  async cancel(id: number, realmId: number): Promise<RaidEvent> {
    const { data } = await apiClient.delete(`/1/events/${id}?realmId=${realmId}`);
    return data.event;
  }
}

export const eventService = new EventService();

export interface AddGuestPayload {
  name: string;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
  class?: string;
  realmId?: number;
}

export interface RaidGuestAssignment {
  id: number;
  guestId: number;
  bossId: number;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
}

class GuestService {
  async add(eventId: number, realmId: number, payload: AddGuestPayload): Promise<RaidGuest> {
    const { data } = await apiClient.post(
      `/1/events/${eventId}/guests?realmId=${realmId}`,
      payload,
    );
    return data.guest;
  }

  async remove(eventId: number, guestId: number, realmId: number): Promise<void> {
    await apiClient.delete(`/1/events/${eventId}/guests/${guestId}?realmId=${realmId}`);
  }

  async getAssignments(eventId: number, realmId: number): Promise<RaidGuestAssignment[]> {
    const { data } = await apiClient.get(
      `/1/events/${eventId}/guests/assignments?realmId=${realmId}`,
    );
    return data.assignments;
  }

  async upsertAssignment(
    eventId: number,
    guestId: number,
    bossId: number,
    realmId: number,
    role: string,
  ): Promise<RaidGuestAssignment> {
    const { data } = await apiClient.put(
      `/1/events/${eventId}/guests/${guestId}/assignments/${bossId}?realmId=${realmId}`,
      { role },
    );
    return data.assignment;
  }

  async removeAssignment(
    eventId: number,
    guestId: number,
    bossId: number,
    realmId: number,
  ): Promise<void> {
    await apiClient.delete(
      `/1/events/${eventId}/guests/${guestId}/assignments/${bossId}?realmId=${realmId}`,
    );
  }
}

export const guestService = new GuestService();
