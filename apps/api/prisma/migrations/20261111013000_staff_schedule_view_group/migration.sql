-- Staff/Admin: preferred academic group for schedule viewing (oversight), not enrollment
ALTER TABLE "StaffProfile" ADD COLUMN "scheduleGroupRuzId" TEXT;
ALTER TABLE "StaffProfile" ADD COLUMN "scheduleGroupLabel" TEXT;
