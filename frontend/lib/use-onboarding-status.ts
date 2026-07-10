'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type OnboardingStatus } from './api';
import { useAuthContext } from './auth-context';

export interface OnboardingData {
  /** Full backend status (null while loading or for admins) */
  status: OnboardingStatus | null;
  isComplete: boolean;
  /** Backend progress string, e.g. "not_started", "payment_done", "completed" */
  progress: string;
}

export function useOnboardingStatus() {
  const { user } = useAuthContext();

  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkOnboardingStatus = useCallback(async () => {
    // Admins have no onboarding
    if (user?.role === 'ADMIN') {
      setOnboardingData({ status: null, isComplete: true, progress: 'completed' });
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const response = await apiClient.getOnboardingStatus();
      const status = (response.data ?? null) as OnboardingStatus | null;

      setOnboardingData({
        status,
        isComplete: status?.completed ?? false,
        progress: status?.progress ?? 'not_started',
      });
    } catch (err: any) {
      console.error('Failed to check onboarding status:', err);
      setError(err.message || 'Failed to check onboarding status');
      setOnboardingData({ status: null, isComplete: false, progress: 'not_started' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, user?.status]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  return {
    onboardingData,
    isLoading,
    error,
    refreshOnboardingStatus: checkOnboardingStatus,
  };
}
