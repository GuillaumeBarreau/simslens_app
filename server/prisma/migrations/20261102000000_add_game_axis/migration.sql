-- SIMS-019 : axe « jeu » (Retail / WoW Forever) sur les guildes et les serveurs.
--
-- Une guilde appartient à un jeu, déduit du serveur choisi à sa création.
-- WoW Forever n'a plus de serveurs : un seul serveur unifié PvE ou PvP par
-- région, représenté par deux lignes `servers` (`forever-pve`, `forever-pvp`).
--
-- Additive : `game` vaut `retail` par défaut, les lignes existantes ne changent
-- pas de sens. Un défaut constant ne réécrit pas la table (PostgreSQL ≥ 11).
-- Rejouable (type, colonnes, index et lignes créés seulement s'ils manquent).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Game') THEN
    CREATE TYPE "Game" AS ENUM ('retail', 'forever');
  END IF;
END $$;

ALTER TABLE "realms" ADD COLUMN IF NOT EXISTS "game" "Game" NOT NULL DEFAULT 'retail';
ALTER TABLE "servers" ADD COLUMN IF NOT EXISTS "game" "Game" NOT NULL DEFAULT 'retail';

CREATE INDEX IF NOT EXISTS "servers_game_idx" ON "servers"("game");

-- Serveurs unifiés Forever, pour chaque région déjà connue (clé étrangère
-- `servers.region` → `regions.name`).
INSERT INTO "servers" ("name", "slug", "locale", "category", "region", "game")
SELECT s.name, s.slug, 'en-GB', 'Forever', r.name, 'forever'::"Game"
FROM "regions" r
CROSS JOIN (VALUES ('Forever PvE', 'forever-pve'), ('Forever PvP', 'forever-pvp')) AS s(name, slug)
WHERE r.name IN ('EU', 'NA', 'US', 'KR', 'TW')
ON CONFLICT ("slug", "region") DO NOTHING;
