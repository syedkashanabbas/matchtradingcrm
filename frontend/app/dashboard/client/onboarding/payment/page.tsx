'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Crown, Zap, AlertCircle, Bitcoin } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  interval?: string;
  features: string[];
  popular?: boolean;
}

export default function ClientOnboardingPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthContext();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'card' | 'crypto'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
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

    if (searchParams.get('canceled') === 'true') {
      setMessage({
        type: 'info',
        text: 'Payment was canceled. You can try again or choose a different plan.',
      });
    }

    const load = async () => {
      try {
        const [plansResponse, statusResponse] = await Promise.all([
          apiClient.getSubscriptionPlans(),
          apiClient.getOnboardingStatus(),
        ]);

        const rawPlans = Array.isArray(plansResponse) ? plansResponse : (plansResponse.data ?? []);
        setPlans(
          (rawPlans as any[]).map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            currency: p.currency,
            interval: p.interval,
            features: p.features ?? [],
            popular: p.popular,
          }))
        );

        if (statusResponse.data?.steps.payment.status === 'COMPLETED') {
          setAlreadyPaid(true);
        }
      } catch (error) {
        console.error('Failed to load plans:', error);
      } finally {
        setPlansLoading(false);
      }
    };

    load();
  }, [isAuthenticated, user, router, searchParams]);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await apiClient.createCheckoutSession(planId, payMethod);

      if (response.url) {
        // Hosted checkout (Stripe or CoinGate); the webhook/IPN completes the payment step
        window.location.href = response.url;
      } else {
        setMessage({ type: 'success', text: 'Plan activated successfully!' });
        setTimeout(() => {
          router.push('/dashboard/client/onboarding/broker');
        }, 1200);
      }
    } catch (error: any) {
      console.error(error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to start checkout',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Onboarding</p>
        <h1 className="page-title">Choose your plan</h1>
        <p className="page-subtitle">Pick the plan that fits how you trade — you can change it anytime.</p>
      </div>

      {message && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'border-success/25 bg-success/10 text-success'
              : message.type === 'error'
                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                : 'border-primary/20 bg-primary/10 text-primary'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="animate-fade-in-up stagger-1">
        <OnboardingStepper current="payment" completed={alreadyPaid ? ['payment'] : []} />
      </div>

      {/* Payment method selector: Card (Stripe) / Crypto (CoinGate) */}
      {!alreadyPaid && (
        <div className="flex justify-center animate-fade-in-up stagger-2">
          <div
            role="group"
            aria-label="Payment method"
            className="inline-flex rounded-xl border border-border/80 bg-muted/50 p-1"
          >
            <button
              type="button"
              onClick={() => setPayMethod('card')}
              aria-pressed={payMethod === 'card'}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                payMethod === 'card'
                  ? 'bg-primary text-primary-foreground elevation-1'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Pay with card
            </button>
            <button
              type="button"
              onClick={() => setPayMethod('crypto')}
              aria-pressed={payMethod === 'crypto'}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                payMethod === 'crypto'
                  ? 'bg-primary text-primary-foreground elevation-1'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bitcoin className="h-4 w-4" aria-hidden="true" />
              Pay with crypto
            </button>
          </div>
        </div>
      )}

      {payMethod === 'crypto' && !alreadyPaid && (
        <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
          You'll be redirected to CoinGate to pay with Bitcoin, Ethereum and 70+ other
          cryptocurrencies. Crypto subscriptions are renewed manually - we'll email you before
          expiry.
        </p>
      )}

      {alreadyPaid && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/10 p-4 text-sm font-medium text-success">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 shrink-0" />
            <span>Your subscription is already active.</span>
          </div>
          <Button size="sm" onClick={() => router.push('/dashboard/client/onboarding/broker')}>
            Continue
          </Button>
        </div>
      )}

      {plansLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-72" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 animate-fade-in-up stagger-3">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular ? 'border-primary/50 ring-2 ring-primary' : ''
              } ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="border-transparent bg-primary text-primary-foreground elevation-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4 text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {index === 0 && <Crown className="h-5 w-5" />}
                  {index === 1 && <Zap className="h-5 w-5" />}
                  {index > 1 && <CreditCard className="h-5 w-5" />}
                </div>
                <CardTitle className="font-display text-2xl">{plan.name}</CardTitle>
                <div className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground tabular-nums">
                  {plan.price === 0 ? (
                    'Free'
                  ) : (
                    <>
                      {plan.price} {plan.currency ?? 'EUR'}
                      <span className="text-sm font-medium text-muted-foreground">
                        /{plan.interval ?? 'month'}
                      </span>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading || alreadyPaid}
                  className="w-full"
                  variant={plan.popular || selectedPlan === plan.id ? 'default' : 'secondary'}
                  size="lg"
                >
                  {isLoading && selectedPlan === plan.id ? 'Processing...' : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
