-- Schedule source-of-truth: RUZ import vs LOCAL owned rows (ADR 0009)
CREATE TYPE "ScheduleLessonSource" AS ENUM ('RUZ', 'LOCAL');
ALTER TABLE "ScheduleLesson" ADD COLUMN "source" "ScheduleLessonSource" NOT NULL DEFAULT 'RUZ';
