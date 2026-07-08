/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PropAccount" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingProgress" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredByCode" TEXT,
ADD COLUMN     "referredByUserId" TEXT,
ADD COLUMN     "registrationSource" TEXT DEFAULT 'organic';

-- CreateTable
CREATE TABLE "NetworkEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "relatedUserId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetworkEvent_userId_idx" ON "NetworkEvent"("userId");

-- CreateIndex
CREATE INDEX "NetworkEvent_eventType_idx" ON "NetworkEvent"("eventType");

-- CreateIndex
CREATE INDEX "NetworkEvent_createdAt_idx" ON "NetworkEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkEvent" ADD CONSTRAINT "NetworkEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
