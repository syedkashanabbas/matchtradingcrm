import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password - EIDOS',
  description: 'Set your new password',
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Set New Password"
      description="Create your new password"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
