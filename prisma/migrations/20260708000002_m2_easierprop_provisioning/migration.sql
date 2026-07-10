-- CreateEnum
CREATE TYPE "ProvisionStatus" AS ENUM ('PENDING', 'KEY_CREATED', 'PROP_ACCOUNT_CREATED', 'BROKER_ACCOUNT_CREATED', 'COMPLETED', 'FAILED', 'DECOMMISSIONED');

-- AlterTable
ALTER TABLE "BrokerAccount" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "epAccountId" TEXT;

-- AlterTable
ALTER TABLE "PropAccount" ADD COLUMN     "epAccountId" TEXT;

-- CreateTable
CREATE TABLE "EasierPropProvision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ProvisionStatus" NOT NULL DEFAULT 'PENDING',
    "epApiKeyEncrypted" TEXT,
    "epKeyId" TEXT,
    "epPropAccountId" TEXT,
    "epBrokerAccountId" TEXT,
    "failedStep" TEXT,
    "lastError" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EasierPropProvision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HedgeSetup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propAccountId" TEXT NOT NULL,
    "brokerAccountId" TEXT NOT NULL,
    "epPropAccountId" TEXT NOT NULL,
    "epBrokerAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HedgeSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCommand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EasierPropProvision_userId_key" ON "EasierPropProvision"("userId");

-- CreateIndex
CREATE INDEX "EasierPropProvision_status_idx" ON "EasierPropProvision"("status");

-- CreateIndex
CREATE INDEX "EasierPropProvision_nextRetryAt_idx" ON "EasierPropProvision"("nextRetryAt");

-- CreateIndex
CREATE INDEX "HedgeSetup_userId_idx" ON "HedgeSetup"("userId");

-- CreateIndex
CREATE INDEX "HedgeSetup_status_idx" ON "HedgeSetup"("status");

-- CreateIndex
CREATE INDEX "ServiceCommand_status_nextRetryAt_idx" ON "ServiceCommand"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "ServiceCommand_userId_idx" ON "ServiceCommand"("userId");

