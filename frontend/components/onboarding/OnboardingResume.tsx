'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';

interface OnboardingResumeProps {
  children: React.ReactNode;
}

export function OnboardingResume({ children }: OnboardingResumeProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    // Check if user is admin - admins should not access onboarding
    if (user.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }

    // Only check onboarding status if user has an access token
    const checkOnboardingStatus = async () => {
      try {
        // Check if we have an access token
        const userStr = sessionStorage.getItem('auth-user');
        if (!userStr) {
          setIsLoading(false);
          return;
        }
        
        const userData = JSON.parse(userStr);
        if (!userData.accessToken) {
          setIsLoading(false);
          return;
        }

        const response = await apiClient.getOnboardingStatus();
        const progress = response.progress;

        // If onboarding is complete, don't redirect
        if (progress === 'subscribed') {
          setIsLoading(false);
          return;
        }

        // Redirect based on current progress
        let redirectPath = '/dashboard/client/onboarding/vps'; // default start
        
        switch (progress) {
          case 'vps_ready':
            redirectPath = '/dashboard/client/onboarding/broker';
            break;
          case 'broker_ready':
            redirectPath = '/dashboard/client/onboarding/prop';
            break;
          case 'prop_ready':
            redirectPath = '/dashboard/client/onboarding/platform';
            break;
          case 'platform_ready':
            redirectPath = '/dashboard/client/onboarding/subscription';
            break;
          case 'review':
            redirectPath = '/dashboard/client';
            break;
          case 'not_started':
          default:
            redirectPath = '/dashboard/client/onboarding/vps';
            break;
        }

        // Check if current path is already the target path
        const currentPath = window.location.pathname;
        if (currentPath !== redirectPath) {
          setShouldRedirect(true);
          router.push(redirectPath);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
