'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, AlertCircle, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';
import { OnboardingStepper, type WizardStepId } from '@/components/onboarding/OnboardingStepper';

export default function ClientOnboardingBrokerPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [form, setForm] = useState({
    brokerName: '',
    mt5AccountNumber: '',
    mt5Password: '',
    mt5Server: '',
    brokerPortalPassword: '',
  });
  const [completedSteps, setCompletedSteps] = useState<WizardStepId[]>([]);
  const [existing, setExisting] = useState<{ brokerName: string; mt5AccountNumber: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }

    apiClient
      .getOnboardingStatus()
      .then(response => {
        const status = response.data;
        if (!status) return;
        const done: WizardStepId[] = [];
        if (status.steps.payment.status === 'COMPLETED') done.push('payment');
        if (status.steps.broker.status === 'COMPLETED') done.push('broker');
        if (status.steps.prop.status === 'COMPLETED') done.push('prop');
        setCompletedSteps(done);
        if (status.steps.broker.data) {
          setExisting({
            brokerName: status.steps.broker.data.brokerName,
            mt5AccountNumber: status.steps.broker.data.mt5AccountNumber,
          });
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user, router]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.brokerName || !form.mt5AccountNumber || !form.mt5Password || !form.mt5Server) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.saveOnboardingBroker({
        brokerName: form.brokerName,
        mt5AccountNumber: form.mt5AccountNumber,
        mt5Password: form.mt5Password,
        mt5Server: form.mt5Server,
        brokerPortalPassword: form.brokerPortalPassword || undefined,
      });
      router.push('/dashboard/client/onboarding/prop');
    } catch (err: any) {
      setError(err.message || 'Failed to save broker account');
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Onboarding</p>
        <h1 className="page-title">Broker Account</h1>
        <p className="page-subtitle">
          Your personal MT5 broker credentials, stored encrypted and used to set up your hedge
          configuration.
        </p>
      </div>

      <div className="animate-fade-in-up stagger-1">
        <OnboardingStepper current="broker" completed={completedSteps} />
      </div>

      {existing && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/10 p-4 text-sm font-medium text-success">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 shrink-0" />
            <span>
              Broker saved: {existing.brokerName} (account{' '}
              <span className="tabular-nums">{existing.mt5AccountNumber}</span>). Submitting again
              will add a new account.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/client/onboarding/prop')}>
            Skip
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="animate-fade-in-up stagger-2">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-lg">MT5 Broker Credentials</CardTitle>
          </div>
          <CardDescription>All fields marked * are required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brokerName" className="text-sm font-medium">Broker Name *</Label>
                <Input
                  id="brokerName"
                  className="h-10 rounded-xl"
                  placeholder="e.g. IC Markets"
                  value={form.brokerName}
                  onChange={handleChange('brokerName')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5Server" className="text-sm font-medium">MT5 Server *</Label>
                <Input
                  id="mt5Server"
                  className="h-10 rounded-xl"
                  placeholder="e.g. ICMarkets-Live01"
                  value={form.mt5Server}
                  onChange={handleChange('mt5Server')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5AccountNumber" className="text-sm font-medium">MT5 Account Number *</Label>
                <Input
                  id="mt5AccountNumber"
                  className="h-10 rounded-xl tabular-nums"
                  placeholder="e.g. 1234567"
                  value={form.mt5AccountNumber}
                  onChange={handleChange('mt5AccountNumber')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5Password" className="text-sm font-medium">MT5 Password *</Label>
                <Input
                  id="mt5Password"
                  className="h-10 rounded-xl"
                  type="password"
                  placeholder="Your MT5 password"
                  value={form.mt5Password}
                  onChange={handleChange('mt5Password')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brokerPortalPassword" className="text-sm font-medium">
                  Broker Portal Password (optional)
                </Label>
                <Input
                  id="brokerPortalPassword"
                  className="h-10 rounded-xl"
                  type="password"
                  placeholder="Password for the broker's client portal"
                  value={form.brokerPortalPassword}
                  onChange={handleChange('brokerPortalPassword')}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/client/onboarding/payment')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
