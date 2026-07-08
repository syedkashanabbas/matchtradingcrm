'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api';

export interface SubscriptionInfo {
  plan: string;
  status: string;
  subscriptionEnd?: string | null;
  nextBillingDate?: string | null;
  features: string[];
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.getSubscriptionInfo();
      setSubscription(response);
    } catch (err: any) {
      console.error('Failed to load subscription:', err);
      setError(err.message || 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upgradePlan = useCallback(async () => {
    try {
      const response = await apiClient.createCheckoutSession();
      // Redirect to Stripe checkout
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      console.error('Failed to upgrade plan:', err);
      setError(err.message || 'Failed to upgrade plan');
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  return {
    subscription,
    isLoading,
    error,
    upgradePlan,
    refreshSubscription: loadSubscription,
  };
}
