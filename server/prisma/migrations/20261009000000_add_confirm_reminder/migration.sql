-- Second rappel de raid, peu avant le début : inscrits « tentative » et
-- titulaires, avec annonce de la composition (SIMS-143).

-- Délai, en heures avant le début du raid. 0 (défaut) = désactivé : une guilde
-- l'active dans ses réglages Discord, rien n'est envoyé sans son choix.
ALTER TABLE "realms"
  ADD COLUMN "confirmReminderHours" INTEGER NOT NULL DEFAULT 0;

-- Garde de réentrance : posée par le planificateur à l'envoi, sur le modèle
-- de "reminderSentAt".
ALTER TABLE "raid_events"
  ADD COLUMN "confirmReminderSentAt" TIMESTAMP(3);
