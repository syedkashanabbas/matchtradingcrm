import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password - EIDOS',
  description: 'Reset your EIDOS account password',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset Password"
      description="Enter your email to receive a password reset code"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
