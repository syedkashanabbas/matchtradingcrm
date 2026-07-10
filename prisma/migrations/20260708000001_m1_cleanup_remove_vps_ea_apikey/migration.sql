-- AlterEnum
BEGIN;
-- Remap rows using removed EA/config alert types before shrinking the enum
UPDATE "Notification" SET "type" = 'ACCOUNT_CHANGE' WHERE "type" IN ('CONFIG_UPDATE', 'EA_CHECK_FAILED', 'DEVICE_LIMIT_EXCEEDED');
UPDATE "Alert" SET "type" = 'ACCOUNT_CHANGE' WHERE "type" IN ('CONFIG_UPDATE', 'EA_CHECK_FAILED', 'DEVICE_LIMIT_EXCEEDED');
CREATE TYPE "AlertType_new" AS ENUM ('PAYMENT_FAILURE', 'ACCOUNT_CHANGE', 'ADMIN_ACTION', 'SUBSCRIPTION_EXPIRED', 'PROVISIONING', 'SERVICE_STATE', 'COMMISSION');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "AlertType_new" USING ("type"::text::"AlertType_new");
ALTER TABLE "Alert" ALTER COLUMN "type" TYPE "AlertType_new" USING ("type"::text::"AlertType_new");
ALTER TYPE "AlertType" RENAME TO "AlertType_old";
ALTER TYPE "AlertType_new" RENAME TO "AlertType";
DROP TYPE "AlertType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKeyDevice" DROP CONSTRAINT "ApiKeyDevice_apiKeyId_fkey";

-- DropForeignKey
ALTER TABLE "VpsConfig" DROP CONSTRAINT "VpsConfig_userId_fkey";

-- DropForeignKey
ALTER TABLE "ConfigHistory" DROP CONSTRAINT "ConfigHistory_configId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "ApiKeyDevice";

-- DropTable
DROP TABLE "VpsConfig";

-- DropTable
DROP TABLE "EaConfig";

-- DropTable
DROP TABLE "ConfigHistory";

