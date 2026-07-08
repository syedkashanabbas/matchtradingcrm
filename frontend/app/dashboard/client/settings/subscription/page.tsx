'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Crown, Zap, Star, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Subscription {
  plan: string;
  price: string;
  status: string;
  nextBillingDate?: string;
  features: string[];
  subscriptionEnd?: string;
}

const planDetails = {
  Free: {
    name: 'Free',
    price: '$0/month',
    icon: Crown,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    features: [
      '1 VPS Configuration',
      '1 Broker Account', 
      '1 Prop Firm Account',
      'Basic Support',
      '100 API calls/month'
    ]
  },
  Pro: {
    name: 'Pro',
    price: '$99/month',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    features: [
      '5 VPS Configurations',
      '5 Broker Accounts',
      '5 Prop Firm Accounts',
      'Priority Support',
      '1000 API calls/month',
      'Advanced Analytics',
      'Custom Integrations'
    ]
  },
  Enterprise: {
    name: 'Enterprise',
    price: '$299/month',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    features: [
      'Unlimited VPS Configurations',
      'Unlimited Broker Accounts',
      'Unlimited Prop Firm Accounts',
      'Dedicated Support',
      'Unlimited API calls',
      'Advanced Analytics',
      'Custom Integrations',
      'White-label Options'
    ]
  }
};

export default function SubscriptionSettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await apiClient.getSubscriptionInfo();
      setSubscription(response as any);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    setIsUpdating(true);
    try {
      const response = await apiClient.createCheckoutSession();
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.cancelSubscription();
      await loadSubscription();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReactivate = async () => {
    setIsUpdating(true);
    try {
      await apiClient.reactivateSubscription();
      await loadSubscription();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const currentPlan = subscription ? planDetails[subscription.plan as keyof typeof planDetails] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <CreditCard className="h-8 w-8" />
          Subscription Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan and billing
        </p>
      </div>

      {/* Current Subscription */}
      {subscription && currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <currentPlan.icon className={`h-6 w-6 ${currentPlan.color}`} />
              Current Plan: {currentPlan.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{currentPlan.price}</p>
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status}
                  </Badge>
                </div>
                <div className="text-right">
                  {subscription.nextBillingDate && (
                    <>
                      <p className="text-sm text-muted-foreground">Next billing</p>
                      <p className="font-medium text-foreground">
                        {new Date(subscription.nextBillingDate).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3">Features</h4>
                <ul className="space-y-2">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <svg className="h-2 w-2 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                {subscription.status === 'active' && subscription.plan !== 'Free' && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="text-red-600 hover:text-red-700"
                  >
                    {isUpdating ? 'Processing...' : 'Cancel Subscription'}
                  </Button>
                )}
                {subscription.status === 'cancelled' && (
                  <Button
                    onClick={handleReactivate}
                    disabled={isUpdating}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {isUpdating ? 'Processing...' : 'Reactivate'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(planDetails).map(([planKey, plan]) => (
            <Card
              key={planKey}
              className={`relative ${
                subscription?.plan === planKey
                  ? 'border-primary shadow-lg'
                  : 'border-border'
              }`}
            >
              {subscription?.plan === planKey && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Current Plan
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={`h-12 w-12 rounded-full ${plan.bgColor} flex items-center justify-center`}>
                    <plan.icon className={`h-6 w-6 ${plan.color}`} />
                  </div>
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-2xl font-bold text-foreground mt-2">
                  {plan.price}
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="h-2 w-2 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleUpgrade(planKey)}
                  disabled={isUpdating || subscription?.plan === planKey}
                  className="w-full"
                  variant={subscription?.plan === planKey ? "outline" : "default"}
                >
                  {subscription?.plan === planKey
                    ? 'Current Plan'
                    : isUpdating
                    ? 'Processing...'
                    : planKey === 'Free'
                    ? 'Downgrade to Free'
                    : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Subscription Status</p>
                <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                  {subscription?.status || 'No subscription'}
                </Badge>
              </div>
              {subscription?.subscriptionEnd && (
                <div>
                  <p className="text-sm text-muted-foreground">Subscription Ends</p>
                  <p className="font-medium text-foreground mt-1">
                    {new Date(subscription.subscriptionEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">
                For billing inquiries or to change your payment method, please contact our support team.
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
