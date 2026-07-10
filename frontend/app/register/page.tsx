'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Suspense } from 'react';

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create Account"
      description="Join EIDOS and start trading today"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
