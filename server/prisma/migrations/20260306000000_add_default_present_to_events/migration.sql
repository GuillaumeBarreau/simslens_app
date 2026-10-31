-- Migration: add defaultPresent to raid_events
-- Created: 2026-03-06

ALTER TABLE "raid_events" ADD COLUMN "defaultPresent" BOOLEAN NOT NULL DEFAULT false;
