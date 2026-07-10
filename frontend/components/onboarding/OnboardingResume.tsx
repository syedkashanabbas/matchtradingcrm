'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { apiClient, type OnboardingStepId } from '@/lib/api';

interface OnboardingResumeProps {
  children: React.ReactNode;
}

const STEP_PATHS: Record<OnboardingStepId, string> = {
  payment: '/dashboard/client/onboarding/payment',
  broker: '/dashboard/client/onboarding/broker',
  prop: '/dashboard/client/onboarding/prop',
};

/**
 * Wizard entry point: reads the resumable per-step status from the backend
 * and redirects to the first incomplete step (or the dashboard when done).
 */
export function OnboardingResume({ children }: OnboardingResumeProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    if (user.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }

    const resume = async () => {
      try {
        const response = await apiClient.getOnboardingStatus();
        const status = response.data;

        if (!status || status.completed) {
          router.push('/dashboard/client');
          return;
        }

        const target = status.nextStep
          ? STEP_PATHS[status.nextStep]
          : '/dashboard/client/onboarding/review';

        if (window.location.pathname !== target) {
          router.push(target);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsLoading(false);
      }
    };

    resume();
  }, [isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
