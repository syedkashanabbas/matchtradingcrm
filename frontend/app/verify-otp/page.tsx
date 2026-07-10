import { VerifyOTPForm } from '@/components/auth/VerifyOTPForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify OTP - EIDOS',
  description: 'Verify your password reset code',
};

export default function VerifyOTPPage() {
  return (
    <AuthLayout
      title="Verify Code"
      description="Enter the 6-digit code sent to your email"
    >
      <VerifyOTPForm />
    </AuthLayout>
  );
}
