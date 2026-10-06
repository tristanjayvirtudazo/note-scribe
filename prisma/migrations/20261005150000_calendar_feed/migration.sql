-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "calendar_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_calendar_token_hash_key" ON "profiles"("calendar_token_hash");

