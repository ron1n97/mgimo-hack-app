-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TEACHER';

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" TEXT,
    "constraintNotes" TEXT,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LessonTeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "scheduleLessonId" TEXT,
    "groupRuzId" TEXT,
    "groupLabel" TEXT,
    "discipline" TEXT,
    "assignedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonTeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTask" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "groupRuzId" TEXT NOT NULL,
    "scheduleLessonId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonTeacherAssignment_teacherUserId_idx" ON "LessonTeacherAssignment"("teacherUserId");

-- CreateIndex
CREATE INDEX "LessonTeacherAssignment_groupRuzId_discipline_idx" ON "LessonTeacherAssignment"("groupRuzId", "discipline");

-- CreateIndex
CREATE INDEX "LessonTeacherAssignment_scheduleLessonId_idx" ON "LessonTeacherAssignment"("scheduleLessonId");

-- CreateIndex
CREATE INDEX "LessonTask_groupRuzId_dueAt_idx" ON "LessonTask"("groupRuzId", "dueAt");

-- CreateIndex
CREATE INDEX "LessonTask_createdByUserId_idx" ON "LessonTask"("createdByUserId");

-- CreateIndex
CREATE INDEX "LessonTask_assignmentId_idx" ON "LessonTask"("assignmentId");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTeacherAssignment" ADD CONSTRAINT "LessonTeacherAssignment_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "TeacherProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTeacherAssignment" ADD CONSTRAINT "LessonTeacherAssignment_scheduleLessonId_fkey" FOREIGN KEY ("scheduleLessonId") REFERENCES "ScheduleLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTeacherAssignment" ADD CONSTRAINT "LessonTeacherAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTask" ADD CONSTRAINT "LessonTask_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LessonTeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTask" ADD CONSTRAINT "LessonTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
