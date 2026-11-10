-- AlterTable StudentProfile: preferred language/stream subgroups
ALTER TABLE "StudentProfile" ADD COLUMN "preferredSubGroupOids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable ScheduleLesson: RUZ parallel discriminators
ALTER TABLE "ScheduleLesson" ADD COLUMN "subGroup" TEXT;
ALTER TABLE "ScheduleLesson" ADD COLUMN "subGroupOid" TEXT;
ALTER TABLE "ScheduleLesson" ADD COLUMN "stream" TEXT;
ALTER TABLE "ScheduleLesson" ADD COLUMN "streamOid" TEXT;

-- Schedule source-of-truth: RUZ import vs LOCAL owned rows
CREATE TYPE "ScheduleLessonSource" AS ENUM ('RUZ', 'LOCAL');
ALTER TABLE "ScheduleLesson" ADD COLUMN "source" "ScheduleLessonSource" NOT NULL DEFAULT 'RUZ';

-- CreateIndex
CREATE INDEX "ScheduleLesson_groupRuzId_subGroupOid_idx" ON "ScheduleLesson"("groupRuzId", "subGroupOid");
