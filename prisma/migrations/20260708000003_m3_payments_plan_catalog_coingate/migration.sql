-- AlterTable (plan enum -> free-form catalog code, converted in place to keep data)
ALTER TABLE "Subscription" ADD COLUMN     "externalOrderId" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'stripe',
ALTER COLUMN "stripeSubscriptionId" DROP NOT NULL,
ALTER COLUMN "stripeCustomerId" DROP NOT NULL,
ALTER COLUMN "plan" TYPE TEXT USING ("plan"::text);

-- DropEnum
DROP TYPE "PlanType";

-- CreateTable
CREATE TABLE "CryptoOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "coingateOrderId" TEXT,
    "localOrderId" TEXT NOT NULL,
    "ipnToken" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "purpose" TEXT NOT NULL DEFAULT 'subscription',
    "paymentUrl" TEXT,
    "ipnHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoOrder_coingateOrderId_key" ON "CryptoOrder"("coingateOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoOrder_localOrderId_key" ON "CryptoOrder"("localOrderId");

-- CreateIndex
CREATE INDEX "CryptoOrder_userId_idx" ON "CryptoOrder"("userId");

-- CreateIndex
CREATE INDEX "CryptoOrder_status_idx" ON "CryptoOrder"("status");

-- CreateIndex
CREATE INDEX "Subscription_provider_idx" ON "Subscription"("provider");

