-- SIMS-206 : notes et assignations par boss, rattachées au roster d'un événement

-- CreateTable
CREATE TABLE "event_boss_notes" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_boss_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_boss_note_assignments" (
    "id" SERIAL NOT NULL,
    "noteId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "task" VARCHAR(200) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_boss_note_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_event_boss_notes_unique" ON "event_boss_notes"("eventId", "bossId");

-- CreateIndex
CREATE INDEX "idx_event_boss_notes_eventId" ON "event_boss_notes"("eventId");

-- CreateIndex
CREATE INDEX "idx_event_boss_note_assignments_noteId" ON "event_boss_note_assignments"("noteId");

-- CreateIndex
CREATE INDEX "idx_event_boss_note_assignments_characterId" ON "event_boss_note_assignments"("characterId");

-- AddForeignKey
ALTER TABLE "event_boss_notes" ADD CONSTRAINT "event_boss_notes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "raid_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_boss_notes" ADD CONSTRAINT "event_boss_notes_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_boss_note_assignments" ADD CONSTRAINT "event_boss_note_assignments_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "event_boss_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_boss_note_assignments" ADD CONSTRAINT "event_boss_note_assignments_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
