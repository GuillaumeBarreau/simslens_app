import { API_VERSION } from '../config/apiConstants';
import { apiClient } from './api.client';

/** État du flux iCal du joueur ; le jeton n'est jamais renvoyé ici. */
export interface CalendarFeedStatus {
  active: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

/** Flux créé ou régénéré : le jeton n'est montré qu'à cette occasion. */
export interface CalendarFeedCreated {
  token: string;
  createdAt: string;
}

const FEED = `${API_VERSION}/events/calendar-feed`;

export const calendarFeedService = {
  getStatus: async (): Promise<CalendarFeedStatus> => {
    const { data } = await apiClient.get<CalendarFeedStatus>(FEED);
    return data;
  },

  regenerate: async (): Promise<CalendarFeedCreated> => {
    const { data } = await apiClient.post<CalendarFeedCreated>(FEED);
    return data;
  },

  revoke: async (): Promise<CalendarFeedStatus> => {
    const { data } = await apiClient.delete<CalendarFeedStatus>(FEED);
    return data;
  },
};
