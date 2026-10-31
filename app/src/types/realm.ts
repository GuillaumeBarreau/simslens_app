export interface Realm {
  id: number;
  name: string;
  slug: string;
  region: string;
  server: string;
  guildName: string;
  category?: string;
  locale?: string;
  timezone?: string;
  ownerId?: string;
  discordGuildId?: string | null;
  discordRaidCategoryId?: string | null;
  signupLockHours?: number;
  signupReminderHours?: number;
  confirmReminderHours?: number;
}
