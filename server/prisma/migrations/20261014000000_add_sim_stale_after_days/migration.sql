-- SIMS-228 : seuil de fraîcheur des sims réglable par guilde.
--
-- Âge (en jours) au-delà duquel le dernier sim d'un personnage est signalé
-- comme périmé (SIMS-199). Défaut 7 : la valeur fixée jusqu'ici dans le code,
-- donc aucun changement pour les guildes existantes. L'API borne la valeur
-- de 1 à 60.
--
-- Rejouable (IF NOT EXISTS).

ALTER TABLE "validation_settings"
  ADD COLUMN IF NOT EXISTS "simStaleAfterDays" INTEGER NOT NULL DEFAULT 7;
