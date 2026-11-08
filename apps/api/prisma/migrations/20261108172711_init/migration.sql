-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'DONE', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "faculty" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "course" INTEGER NOT NULL,
    "groupLabel" TEXT NOT NULL,
    "groupRuzId" TEXT,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" TEXT NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ScheduleLesson" (
    "id" TEXT NOT NULL,
    "ruzExternalId" TEXT NOT NULL,
    "groupRuzId" TEXT NOT NULL,
    "groupLabel" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "begin" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "lecturer" TEXT,
    "auditorium" TEXT,
    "building" TEXT,
    "kindOfWork" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "isMoved" BOOLEAN NOT NULL DEFAULT false,
    "rawJson" JSONB,

    CONSTRAINT "ScheduleLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "gradeType" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "isDebt" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestTicket" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'SUBMITTED',
    "aiDraft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus" NOT NULL,
    "note" TEXT,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ScheduleLesson_groupRuzId_date_idx" ON "ScheduleLesson"("groupRuzId", "date");

-- CreateIndex
CREATE INDEX "ScheduleLesson_date_idx" ON "ScheduleLesson"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleLesson_ruzExternalId_groupRuzId_date_begin_key" ON "ScheduleLesson"("ruzExternalId", "groupRuzId", "date", "begin");

-- CreateIndex
CREATE INDEX "Grade_studentUserId_idx" ON "Grade"("studentUserId");

-- CreateIndex
CREATE INDEX "RequestTicket_studentUserId_idx" ON "RequestTicket"("studentUserId");

-- CreateIndex
CREATE INDEX "RequestTicket_status_idx" ON "RequestTicket"("status");

-- CreateIndex
CREATE INDEX "RequestEvent_ticketId_idx" ON "RequestEvent"("ticketId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTicket" ADD CONSTRAINT "RequestTicket_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RequestTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
