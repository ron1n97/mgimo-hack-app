-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ClubSourceKind" AS ENUM ('TELEGRAM', 'VK', 'WEBSITE');

-- CreateEnum
CREATE TYPE "ClubMembershipRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "EventModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ClubStatus" NOT NULL DEFAULT 'DRAFT',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "websiteUrl" TEXT,
    "structureNote" TEXT,
    "createdByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubTag" (
    "clubId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ClubTag_pkey" PRIMARY KEY ("clubId","tagId")
);

-- CreateTable
CREATE TABLE "ClubSource" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "kind" "ClubSourceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubMembershipRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTagSubscription" (
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTagSubscription_pkey" PRIMARY KEY ("userId","tagId")
);

-- CreateTable
CREATE TABLE "ClubSubscription" (
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubSubscription_pkey" PRIMARY KEY ("userId","clubId")
);

-- CreateTable
CREATE TABLE "EventCandidate" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "startsAt" TIMESTAMP(3),
    "moderationStatus" "EventModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "moderatedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Club_status_idx" ON "Club"("status");

-- CreateIndex
CREATE INDEX "Club_digestEnabled_idx" ON "Club"("digestEnabled");

-- CreateIndex
CREATE INDEX "Club_name_idx" ON "Club"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "ClubTag_tagId_idx" ON "ClubTag"("tagId");

-- CreateIndex
CREATE INDEX "ClubSource_clubId_idx" ON "ClubSource"("clubId");

-- CreateIndex
CREATE INDEX "ClubSource_kind_enabled_idx" ON "ClubSource"("kind", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSource_url_key" ON "ClubSource"("url");

-- CreateIndex
CREATE INDEX "ClubMembership_userId_idx" ON "ClubMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMembership_clubId_userId_key" ON "ClubMembership"("clubId", "userId");

-- CreateIndex
CREATE INDEX "StudentTagSubscription_tagId_idx" ON "StudentTagSubscription"("tagId");

-- CreateIndex
CREATE INDEX "ClubSubscription_clubId_idx" ON "ClubSubscription"("clubId");

-- CreateIndex
CREATE INDEX "EventCandidate_moderationStatus_createdAt_idx" ON "EventCandidate"("moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "EventCandidate_clubId_idx" ON "EventCandidate"("clubId");

-- CreateIndex
CREATE INDEX "EventCandidate_sourceId_idx" ON "EventCandidate"("sourceId");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubTag" ADD CONSTRAINT "ClubTag_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubTag" ADD CONSTRAINT "ClubTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSource" ADD CONSTRAINT "ClubSource_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSource" ADD CONSTRAINT "ClubSource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTagSubscription" ADD CONSTRAINT "StudentTagSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTagSubscription" ADD CONSTRAINT "StudentTagSubscription_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSubscription" ADD CONSTRAINT "ClubSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSubscription" ADD CONSTRAINT "ClubSubscription_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCandidate" ADD CONSTRAINT "EventCandidate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCandidate" ADD CONSTRAINT "EventCandidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ClubSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCandidate" ADD CONSTRAINT "EventCandidate_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
