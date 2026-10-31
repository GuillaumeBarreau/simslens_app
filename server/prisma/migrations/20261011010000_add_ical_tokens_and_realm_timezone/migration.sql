-- Export iCal des soirées et fuseau horaire du royaume (SIMS-204).

-- Fuseau IANA dans lequel le serveur formate les heures des messages Discord
-- (annonce, rappels). Europe/Paris par défaut : les guildes actuelles sont
-- françaises. L'application, elle, affiche l'heure du navigateur.
ALTER TABLE "realms"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris';

-- Jeton du flux iCal privé d'un joueur : un seul par joueur, régénérable
-- (remplacé) ou révocable (supprimé). Seul le SHA-256 est stocké.
CREATE TABLE "calendar_feed_tokens" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "calendar_feed_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_feed_tokens_userId_key" ON "calendar_feed_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_feed_tokens_tokenHash_key" ON "calendar_feed_tokens"("tokenHash");
