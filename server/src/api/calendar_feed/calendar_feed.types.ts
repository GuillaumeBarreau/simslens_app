import type { calendar_feed_tokens, EventStatus, SignupStatus } from '@prisma/client';

export type CalendarFeedTokenEntity = calendar_feed_tokens;

export interface FeedCharacter {
  id: number;
  name: string;
  realmId: number;
}

export interface FeedEventRow {
  id: number;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: EventStatus;
  isOptional: boolean;
  updatedAt: Date;
  realmId: number;
  realm: { guildName: string };
}

export interface FeedSignupRow {
  eventId: number;
  characterId: number;
  status: SignupStatus;
  lateTime: string | null;
  updatedAt: Date;
  character: { name: string };
}

/** État du flux d'un joueur, sans le jeton (il n'est montré qu'à la création). */
export interface CalendarFeedStatus {
  active: boolean;
  createdAt: Date | null;
  lastUsedAt: Date | null;
}

/** Flux créé ou régénéré : le jeton brut, à afficher une seule fois. */
export interface CalendarFeedCreated {
  token: string;
  createdAt: Date;
}
