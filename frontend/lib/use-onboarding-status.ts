'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api';
import { useAuthContext } from './auth-context';

const RECOMPILE_FORCE = true;

export type Status =
  | 'pending'
  | 'review'
  | 'certified'
  | 'active'
  | 'suspended';

export interface OnboardingStep {
  id: string;
  name: string;
  status: Status;
  description?: string;
}

export interface OnboardingData {
  steps: OnboardingStep[];
  isComplete: boolean;
  progress: string | number;  // Backend sends string status like "active", "review", etc.
}

export type UserStatus = Status;

export function useOnboardingStatus() {
  const { user } = useAuthContext();

  const [onboardingData, setOnboardingData] =
    useState<OnboardingData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkOnboardingStatus = useCallback(async () => {
    // Don't check onboarding for admin users
    if (user?.role === 'ADMIN') {
      setOnboardingData({
        steps: [],
        isComplete: true,
        progress: 100,
      });
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const onboardingResponse = await apiClient
        .getClientOnboarding()
        .catch((error) => {
          console.log('Onboarding API not available, using default state');
          return { steps: [], progress: 'not_started' };
        });

      const steps: OnboardingStep[] = (onboardingResponse.steps || []).map(
        (step: any) => ({
          id: step.id,
          name: step.name,
          status: ((step.status || 'pending').toLowerCase() as Status),
          description: step.description,
        })
      );

      const userStatus: UserStatus = (() => {
        switch (user?.status?.toLowerCase()) {
          case 'active':
            return 'active';
          case 'suspended':
            return 'suspended';
          case 'certified':
            return 'certified';
          case 'review':
            return 'review';
          default:
            return 'pending';
        }
      })();

      // If user is active, mark all steps as active and complete
      if (userStatus === 'active') {
        const activeSteps: OnboardingStep[] = steps.map((step) => ({
          ...step,
          status: 'active',
        }));

        setOnboardingData({
          steps: activeSteps,
          isComplete: true,
          progress: 100,
        });

        setIsLoading(false);
        return;
      }

      // Check if all steps are completed
      const allStepsComplete = steps.every((step) =>
        ['certified', 'active'].includes(step.status)
      );

      // At this point userStatus cannot be 'active' because it already returned above
      const userIsActive = userStatus === 'certified';

      const isComplete = allStepsComplete && userIsActive;

      const completedSteps = steps.filter((step) =>
        ['certified', 'active'].includes(step.status)
      ).length;

      const progress =
        steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

      setOnboardingData({
        steps,
        isComplete,
        progress,
      });
    } catch (err: any) {
      console.error('Failed to check onboarding status:', err);

      // Don't set error state for network issues during signup
      if (err.message?.includes('Failed to fetch') || err.message?.includes('Network error')) {
        console.log('Network error during onboarding check, using default state');
        setOnboardingData({
          steps: [],
          isComplete: false,
          progress: 0,
        });
      } else {
        setError(err.message || 'Failed to check onboarding status');
        setOnboardingData({
          steps: [],
          isComplete: false,
          progress: 0,
        });
      }
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