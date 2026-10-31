import { apiClient } from './api.client';

/** Assignation d'une note de boss : un titulaire du boss et sa tâche. */
export interface BossNoteAssignment {
  characterId: number;
  characterName: string;
  characterClass: string | null;
  task: string;
  position: number;
  /** false si le personnage a quitté le roster du boss depuis l'assignation. */
  isHolder: boolean;
}

/** Note de stratégie d'un boss sur un événement (SIMS-206). */
export interface BossNote {
  eventId: number;
  bossId: number;
  /** Markdown. */
  content: string;
  updatedAt: string;
  assignments: BossNoteAssignment[];
}

export interface SaveBossNotePayload {
  content: string;
  assignments: { characterId: number; task: string }[];
}

class BossNoteService {
  async list(eventId: number, realmId: number): Promise<BossNote[]> {
    const { data } = await apiClient.get(`/1/events/${eventId}/boss-notes?realmId=${realmId}`);
    return data.notes;
  }

  /**
   * Remplace la note et les assignations d'un boss. Renvoie null quand la
   * note, vidée, a été supprimée.
   */
  async save(
    eventId: number,
    realmId: number,
    bossId: number,
    payload: SaveBossNotePayload,
  ): Promise<BossNote | null> {
    const { data } = await apiClient.put(
      `/1/events/${eventId}/boss-notes/${bossId}?realmId=${realmId}`,
      payload,
    );
    return data.note;
  }
}

export const bossNoteService = new BossNoteService();
