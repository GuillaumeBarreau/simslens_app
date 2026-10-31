-- Add per-realm signup lock window and reminder window, plus per-event reminder timestamp.

ALTER TABLE "realms"
  ADD COLUMN "signupLockHours"     INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "signupReminderHours" INTEGER NOT NULL DEFAULT 2;

ALTER TABLE "raid_events"
  ADD COLUMN "reminderSentAt" TIMESTAMP(3);
