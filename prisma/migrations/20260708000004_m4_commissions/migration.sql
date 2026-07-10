-- AlterTable
ALTER TABLE "User" ADD COLUMN     "payoutReference" TEXT;

-- CreateTable
CREATE TABLE "CommissionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPlanLevel" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "CommissionPlanLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EARNED',
    "reversedAfterPayout" BOOLEAN NOT NULL DEFAULT false,
    "payoutBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutBatch" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "paidAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPlanLevel_planId_level_key" ON "CommissionPlanLevel"("planId", "level");

-- CreateIndex
CREATE INDEX "Commission_agentId_status_idx" ON "Commission"("agentId", "status");

-- CreateIndex
CREATE INDEX "Commission_paymentRef_idx" ON "Commission"("paymentRef");

-- CreateIndex
CREATE INDEX "Commission_createdAt_idx" ON "Commission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_paymentRef_agentId_key" ON "Commission"("paymentRef", "agentId");

-- CreateIndex
CREATE INDEX "PayoutBatch_status_idx" ON "PayoutBatch"("status");

-- AddForeignKey
ALTER TABLE "CommissionPlanLevel" ADD CONSTRAINT "CommissionPlanLevel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CommissionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "PayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

