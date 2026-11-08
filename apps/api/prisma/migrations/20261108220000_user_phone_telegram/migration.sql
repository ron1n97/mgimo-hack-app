-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneE164" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
