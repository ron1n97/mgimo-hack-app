-- CreateTable
CREATE TABLE "TimetableSolveRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "objective" DOUBLE PRECISION,
    "message" TEXT,
    "groupRuzIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "lambdasJson" JSONB,
    "softJson" JSONB,
    "instanceMeta" JSONB,
    "solutionJson" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elapsedMs" INTEGER,

    CONSTRAINT "TimetableSolveRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetableSolveRun_createdAt_idx" ON "TimetableSolveRun"("createdAt");

-- CreateIndex
CREATE INDEX "TimetableSolveRun_status_idx" ON "TimetableSolveRun"("status");

-- AddForeignKey
ALTER TABLE "TimetableSolveRun" ADD CONSTRAINT "TimetableSolveRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
