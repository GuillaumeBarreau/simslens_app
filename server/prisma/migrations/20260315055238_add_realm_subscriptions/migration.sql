-- CreateTable
CREATE TABLE "realm_subscriptions" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "price" DECIMAL(10,2) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realm_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "realm_subscriptions_realmId_idx" ON "realm_subscriptions"("realmId");

-- CreateIndex
CREATE INDEX "realm_subscriptions_status_idx" ON "realm_subscriptions"("status");

-- CreateIndex
CREATE INDEX "realm_subscriptions_expiresAt_idx" ON "realm_subscriptions"("expiresAt");

-- AddForeignKey
ALTER TABLE "realm_subscriptions" ADD CONSTRAINT "realm_subscriptions_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
