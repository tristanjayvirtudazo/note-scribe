-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "mastery" INTEGER,
ADD COLUMN     "review_box" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "review_due_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "last_studied_on" DATE,
ADD COLUMN     "study_streak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "flashcards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "note_id" UUID NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 0,
    "due_at" TIMESTAMPTZ(6),
    "reviewed_count" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flashcards_note_id_position_idx" ON "flashcards"("note_id", "position");

-- CreateIndex
CREATE INDEX "flashcards_user_id_due_at_idx" ON "flashcards"("user_id", "due_at");

-- CreateIndex
CREATE INDEX "notes_user_id_review_due_at_idx" ON "notes"("user_id", "review_due_at");

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row Level Security (see the init migration for why)
ALTER TABLE "flashcards" ENABLE ROW LEVEL SECURITY;
