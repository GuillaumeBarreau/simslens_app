import type { GameId } from 'config/games';

export interface Realm {
  id: number;
  /** Jeu de la guilde (SIMS-019) ; absent des anciennes réponses → Retail. */
  game?: GameId;
  name: string;
  slug: string;
  region: string;
  server: string;
  guildName: string;
  category?: string;
  locale?: string;
  timezone?: string;
  ownerId?: string;
  /** Identifiant de l'utilisateur qui a créé la guilde. */
  createdBy?: number;
  discordGuildId?: string | null;
  discordRaidCategoryId?: string | null;
  signupLockHours?: number;
  signupReminderHours?: number;
  confirmReminderHours?: number;
}
