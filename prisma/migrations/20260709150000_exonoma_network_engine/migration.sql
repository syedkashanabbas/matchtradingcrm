-- DropIndex
DROP INDEX "Commission_paymentRef_agentId_key";

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "originalBeneficiaryId" TEXT,
ADD COLUMN     "wasCompressed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CommissionPlanLevel" ADD COLUMN     "minActiveDirects" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QualificationSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "activeDirectCount" INTEGER NOT NULL,
    "qualifiesLevel2" BOOLEAN NOT NULL,
    "qualifiesLevel3" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualificationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "winnersLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelPromo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "threshold" DECIMAL(12,2) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelPromo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelPromoProgress" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_REACHED',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelPromoProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QualificationSnapshot_period_idx" ON "QualificationSnapshot"("period");

-- CreateIndex
CREATE UNIQUE INDEX "QualificationSnapshot_userId_period_key" ON "QualificationSnapshot"("userId", "period");

-- CreateIndex
CREATE INDEX "Challenge_status_endsAt_idx" ON "Challenge"("status", "endsAt");

-- CreateIndex
CREATE INDEX "TravelPromo_deadline_idx" ON "TravelPromo"("deadline");

-- CreateIndex
CREATE INDEX "TravelPromoProgress_userId_idx" ON "TravelPromoProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelPromoProgress_promoId_userId_key" ON "TravelPromoProgress"("promoId", "userId");

-- CreateIndex
CREATE INDEX "Commission_agentId_idx" ON "Commission"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_paymentRef_level_key" ON "Commission"("paymentRef", "level");

-- AddForeignKey
ALTER TABLE "QualificationSnapshot" ADD CONSTRAINT "QualificationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPromoProgress" ADD CONSTRAINT "TravelPromoProgress_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "TravelPromo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPromoProgress" ADD CONSTRAINT "TravelPromoProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

