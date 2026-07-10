import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - EIDOS',
  description: 'Sign in to your EIDOS account',
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      description="Sign in to continue to your dashboard"
    >
      <LoginForm />
    </AuthLayout>
  );
}
