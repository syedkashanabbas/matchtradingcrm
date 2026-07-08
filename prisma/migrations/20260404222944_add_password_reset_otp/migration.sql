-- CreateTable
CREATE TABLE "PasswordResetOTP" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PasswordResetOTP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetOTP_email_idx" ON "PasswordResetOTP"("email");

-- CreateIndex
CREATE INDEX "PasswordResetOTP_expiresAt_idx" ON "PasswordResetOTP"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetOTP_email_key" ON "PasswordResetOTP"("email");
