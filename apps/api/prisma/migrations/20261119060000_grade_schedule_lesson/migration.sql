-- AlterTable
ALTER TABLE "Grade" ADD COLUMN "scheduleLessonId" TEXT;

-- CreateIndex
CREATE INDEX "Grade_scheduleLessonId_idx" ON "Grade"("scheduleLessonId");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_scheduleLessonId_fkey" FOREIGN KEY ("scheduleLessonId") REFERENCES "ScheduleLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
