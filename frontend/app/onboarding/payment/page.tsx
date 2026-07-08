'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Crown, Zap } from 'lucide-react';
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

export default function OnboardingPaymentPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user is admin - admins should not access onboarding
    if (user?.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }
  }, [isAuthenticated, user, router]);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    
    if (planId === 'free') {
      // For free plan, skip payment and go directly to VPS setup
      setIsLoading(true);
      try {
        await apiClient.createCheckoutSession();
        router.push('/onboarding/vps');
      } catch (error) {
        console.error('Error setting up free plan:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // For paid plans, create Stripe checkout
      setIsLoading(true);
      try {
        const response = await apiClient.createCheckoutSession();
        
        if (response.url) {
          // Redirect to Stripe checkout
          window.location.href = response.url;
        }
      } catch (error) {
        console.error('Error creating checkout session:', error);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            Select the plan that best fits your trading needs
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <span className="text-sm font-medium">Payment</span>
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="text-sm text-muted-foreground">VPS</span>
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="text-sm text-muted-foreground">Broker</span>
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <span className="text-sm text-muted-foreground">Prop Firm</span>
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                5
              </div>
              <span className="text-sm text-muted-foreground">Review</span>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  size="lg"
                >
                  {isLoading && selectedPlan === plan.id
                    ? 'Processing...'
                    : plan.id === 'free'
                    ? 'Start Free'
                    : 'Subscribe Now'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back Button */}
        <div className="flex justify-center mt-12">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
