-- AlterTable
ALTER TABLE "item_tokens" ADD COLUMN "extension" TEXT NOT NULL DEFAULT '';
ALTER TABLE "item_tokens" ADD COLUMN "season" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "item_tokens_extension_season_idx" ON "item_tokens"("extension", "season");
