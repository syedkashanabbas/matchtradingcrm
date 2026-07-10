'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, Building, CreditCard, TrendingUp, Pencil, PartyPopper } from 'lucide-react';
import { apiClient, type OnboardingStatus } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';
import { OnboardingStepper, type WizardStepId } from '@/components/onboarding/OnboardingStepper';

export default function ClientOnboardingReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthContext();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentJustSucceeded = searchParams.get('success') === 'true';

  const loadStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.getOnboardingStatus();
      setStatus(response.data ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load onboarding status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }
    loadStatus();
  }, [isAuthenticated, user, router, loadStatus]);

  // After Stripe checkout the webhook completes the payment step asynchronously:
  // poll a few times until it lands.
  useEffect(() => {
    if (!paymentJustSucceeded || !status || status.steps.payment.status === 'COMPLETED') return;
    const timer = setInterval(loadStatus, 3000);
    const stop = setTimeout(() => clearInterval(timer), 60000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [paymentJustSucceeded, status, loadStatus]);

  const completedSteps: WizardStepId[] = [];
  if (status?.steps.payment.status === 'COMPLETED') completedSteps.push('payment');
  if (status?.steps.broker.status === 'COMPLETED') completedSteps.push('broker');
  if (status?.steps.prop.status === 'COMPLETED') completedSteps.push('prop');

  const allComplete = status?.completed ?? false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Onboarding</p>
        <h1 className="page-title">Review Your Setup</h1>
        <p className="page-subtitle">
          Check your details below. You can edit any step before finishing.
        </p>
      </div>

      <div className="animate-fade-in-up stagger-1">
        <OnboardingStepper current="review" completed={completedSteps} />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {paymentJustSucceeded && status?.steps.payment.status !== 'COMPLETED' && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm font-medium text-primary">
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-primary" />
          <span>Confirming your payment… this usually takes a few seconds.</span>
        </div>
      )}

      {/* Payment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-lg">Subscription</CardTitle>
            {status?.steps.payment.status === 'COMPLETED' ? (
              <Badge className="border-success/25 bg-success/15 text-success">
                <Check className="mr-1 h-3 w-3" /> Active
              </Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/client/onboarding/payment')}
          >
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          {status?.steps.payment.data ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Plan</p>
                <p className="font-medium">{status.steps.payment.data.plan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Renews</p>
                <p className="font-medium">
                  {new Date(status.steps.payment.data.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Broker */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-lg">Broker Account</CardTitle>
            {status?.steps.broker.status === 'COMPLETED' ? (
              <Badge className="border-success/25 bg-success/15 text-success">
                <Check className="mr-1 h-3 w-3" /> Saved
              </Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/client/onboarding/broker')}
          >
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          {status?.steps.broker.data ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Broker</p>
                <p className="font-medium">{status.steps.broker.data.brokerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account</p>
                <p className="font-medium">{status.steps.broker.data.mt5AccountNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Server</p>
                <p className="font-medium">{status.steps.broker.data.mt5Server}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Password</p>
                <p className="font-medium">{status.steps.broker.data.mt5Password ?? '••••••'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No broker account yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Prop */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-lg">Prop Firm Account</CardTitle>
            {status?.steps.prop.status === 'COMPLETED' ? (
              <Badge className="border-success/25 bg-success/15 text-success">
                <Check className="mr-1 h-3 w-3" /> Saved
              </Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/client/onboarding/prop')}
          >
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          {status?.steps.prop.data ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Firm</p>
                <p className="font-medium">{status.steps.prop.data.firmName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account</p>
                <p className="font-medium">{status.steps.prop.data.mt5AccountNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Server</p>
                <p className="font-medium">{status.steps.prop.data.mt5Server}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phase</p>
                <p className="font-medium">{status.steps.prop.data.phase}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No prop firm account yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Finish */}
      {allComplete ? (
        <Card className="border-success/25 bg-success/[0.06] animate-fade-in-up">
          <CardContent className="flex flex-col items-center justify-between gap-5 py-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
                <PartyPopper className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">You're all set!</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Your service is being provisioned automatically. Track its status on your dashboard.
                </p>
              </div>
            </div>
            <Button onClick={() => router.push('/dashboard/client')} size="lg">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/10 p-4 text-sm font-medium text-warning">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Complete the pending steps above to finish your onboarding.</span>
        </div>
      )}
    </div>
  );
}
