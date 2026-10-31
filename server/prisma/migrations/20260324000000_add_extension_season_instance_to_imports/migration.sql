-- AlterTable: add extension, season, instanceId to imports
ALTER TABLE "imports" ADD COLUMN "extension" TEXT;
ALTER TABLE "imports" ADD COLUMN "season" TEXT;
ALTER TABLE "imports" ADD COLUMN "instanceId" INTEGER;

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "instances"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- CreateIndex
CREATE INDEX "imports_extension_season_idx" ON "imports"("extension", "season");
