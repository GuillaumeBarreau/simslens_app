-- CreateTable
CREATE TABLE "realm_invite_codes" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realm_invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realm_user_guests" (
    "id" SERIAL NOT NULL,
    "realmId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteCodeId" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realm_user_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "realm_invite_codes_code_key" ON "realm_invite_codes"("code");

-- CreateIndex
CREATE INDEX "realm_invite_codes_realmId_idx" ON "realm_invite_codes"("realmId");

-- CreateIndex
CREATE INDEX "realm_invite_codes_code_idx" ON "realm_invite_codes"("code");

-- CreateIndex
CREATE INDEX "realm_user_guests_realmId_idx" ON "realm_user_guests"("realmId");

-- CreateIndex
CREATE INDEX "realm_user_guests_userId_idx" ON "realm_user_guests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "realm_user_guests_realmId_userId_key" ON "realm_user_guests"("realmId", "userId");

-- AddForeignKey
ALTER TABLE "realm_invite_codes" ADD CONSTRAINT "realm_invite_codes_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realm_user_guests" ADD CONSTRAINT "realm_user_guests_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "realms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realm_user_guests" ADD CONSTRAINT "realm_user_guests_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "realm_invite_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
