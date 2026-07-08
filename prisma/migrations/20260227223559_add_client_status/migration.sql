-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('NEW', 'ONBOARDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'NEW';
