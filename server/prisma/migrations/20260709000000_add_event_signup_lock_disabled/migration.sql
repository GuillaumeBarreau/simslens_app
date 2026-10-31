-- Per-event override to disable the signup lock window (realm signupLockHours).
-- When true, non-admins can still change their signup after the lock window opens.

ALTER TABLE "raid_events"
  ADD COLUMN "signupLockDisabled" BOOLEAN NOT NULL DEFAULT false;
