'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Crown, Zap, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  priceId: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0/month',
    priceId: 'free',
    features: [
      '1 VPS Configuration',
      '1 Broker Account',
      '1 Prop Firm Account',
      'Basic Support',
      '100 API calls/month'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$99/month',
    priceId: 'pro',
    popular: true,
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
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$299/month',
    priceId: 'enterprise',
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
];

export default function ClientOnboardingPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }

    // Handle URL parameters
    const canceled = searchParams.get('canceled');
    if (canceled === 'true') {
      setMessage({
        type: 'info',
        text: 'Payment was canceled. You can try again or choose a different plan.'
      });
    }
  }, [isAuthenticated, user, router, searchParams]);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    setMessage(null);

    // Get selected plan data
    const selectedPlanData = plans.find(plan => plan.id === planId);
    if (selectedPlanData) {
      // Store selected plan data in sessionStorage
      sessionStorage.setItem('selectedPlan', JSON.stringify({
        id: selectedPlanData.id,
        name: selectedPlanData.name,
        price: selectedPlanData.price,
        priceId: selectedPlanData.priceId,
        popular: selectedPlanData.popular
      }));
    }

    if (planId === 'free') {
      setIsLoading(true);
      try {
        const response = await apiClient.createCheckoutSession('free');
        if (response.message === 'Free plan activated') {
          setMessage({
            type: 'success',
            text: 'Free plan activated successfully!'
          });
          setTimeout(() => {
            router.push('/dashboard/client/onboarding/review');
          }, 1500);
        }
      } catch (error: any) {
        console.error(error);
        setMessage({
          type: 'error',
          text: error.message || 'Failed to activate free plan'
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        const response = await apiClient.createCheckoutSession(planId);

        if (response.url) {
          window.location.href = response.url;
        } else {
          setMessage({
            type: 'success',
            text: 'Plan activated successfully!'
          });
          setTimeout(() => {
            router.push('/dashboard/client/onboarding/review');
          }, 1500);
        }
      } catch (error: any) {
        console.error(error);
        setMessage({
          type: 'error',
          text: error.message || 'Failed to create checkout session'
        });
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Select the plan that best fits your trading needs
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.type === 'success' && <Check className="h-5 w-5" />}
          {message.type === 'error' && <AlertCircle className="h-5 w-5" />}
          {message.type === 'info' && <AlertCircle className="h-5 w-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Progress */}
      <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 min-w-max px-2 sm:px-0">

            {/* 1 VPS */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                1
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">VPS</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />

            {/* 2 Broker */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                2
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Broker</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />

            {/* 3 Prop Firm */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                3
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Prop Firm</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />

            {/* 4 Payment (ACTIVE) */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                4
              </div>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Payment</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />

            {/* 5 Review */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                5
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Review</span>
            </div>

          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.popular
                ? 'border-primary shadow-lg scale-105'
                : 'border-border'
            } ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                {plan.id === 'free' && <Crown className="h-8 w-8 text-muted-foreground" />}
                {plan.id === 'pro' && <Zap className="h-8 w-8 text-primary" />}
                {plan.id === 'enterprise' && <CreditCard className="h-8 w-8 text-purple-600" />}
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold text-foreground mt-2">
                {plan.price}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isLoading}
                className={`w-full ${
                  plan.popular
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : selectedPlan === plan.id
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
                size="lg"
              >
                {isLoading && selectedPlan === plan.id
                  ? 'Processing...'
                  : plan.id === 'free'
                  ? 'Start Free'
                  : plan.id === 'pro'
                  ? 'Choose Pro Plan'
                  : 'Choose Enterprise'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Back */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/client')}
          disabled={isLoading}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}