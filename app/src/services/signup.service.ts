import { apiClient } from './api.client';
import type { RaidSignup } from './event.service';

export interface CreateSignupPayload {
  characterId: number;
  status: 'PRESENT' | 'ABSENT' | 'TENTATIVE' | 'BENCH' | 'LATE';
  role?: string;
  lateTime?: string;
  absenceReason?: string;
}

export interface RosterResponse {
  tanks: RaidSignup[];
  healers: RaidSignup[];
  dps: RaidSignup[];
  counts: {
    tanks: number;
    healers: number;
    dps: number;
    total: number;
    present: number;
    absent: number;
    tentative: number;
    late: number;
    bench: number;
  };
}

class SignupService {
  async upsert(
    eventId: number,
    realmId: number,
    payload: CreateSignupPayload,
  ): Promise<RaidSignup> {
    const { data } = await apiClient.post(
      `/1/events/${eventId}/signup?realmId=${realmId}`,
      payload,
    );
    return data.signup;
  }

  async getRoster(eventId: number, realmId: number): Promise<RosterResponse> {
    const { data } = await apiClient.get(`/1/events/${eventId}/roster?realmId=${realmId}`);
    return data.roster;
  }

  async remove(eventId: number, characterId: number, realmId: number): Promise<void> {
    await apiClient.delete(`/1/events/${eventId}/signup/${characterId}?realmId=${realmId}`);
  }
}

export const signupService = new SignupService();
