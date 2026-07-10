'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, AlertCircle, Building } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';
import { OnboardingStepper, type WizardStepId } from '@/components/onboarding/OnboardingStepper';

export default function ClientOnboardingPropPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [form, setForm] = useState({
    firmName: '',
    mt5AccountNumber: '',
    mt5Password: '',
    mt5Server: '',
    phase: 'CHALLENGE' as 'CHALLENGE' | 'FUNDED',
  });
  const [completedSteps, setCompletedSteps] = useState<WizardStepId[]>([]);
  const [existing, setExisting] = useState<{ firmName: string; mt5AccountNumber: string } | null>(null);
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
        if (status.steps.prop.data) {
          setExisting({
            firmName: status.steps.prop.data.firmName,
            mt5AccountNumber: status.steps.prop.data.mt5AccountNumber,
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

    if (!form.firmName || !form.mt5AccountNumber || !form.mt5Password || !form.mt5Server) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.saveOnboardingProp({
        firmName: form.firmName,
        mt5AccountNumber: form.mt5AccountNumber,
        mt5Password: form.mt5Password,
        mt5Server: form.mt5Server,
        phase: form.phase,
      });
      router.push('/dashboard/client/onboarding/review');
    } catch (err: any) {
      setError(err.message || 'Failed to save prop firm account');
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Onboarding</p>
        <h1 className="page-title">Prop Firm Account</h1>
        <p className="page-subtitle">
          Your prop firm MT5 credentials. When your challenge cycle changes you can register the
          new account from Settings.
        </p>
      </div>

      <div className="animate-fade-in-up stagger-1">
        <OnboardingStepper current="prop" completed={completedSteps} />
      </div>

      {existing && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/10 p-4 text-sm font-medium text-success">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 shrink-0" />
            <span>
              Prop account saved: {existing.firmName} (account{' '}
              <span className="tabular-nums">{existing.mt5AccountNumber}</span>). Submitting again
              archives it and registers the new one.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/client/onboarding/review')}>
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
              <Building className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-lg">Prop Firm MT5 Credentials</CardTitle>
          </div>
          <CardDescription>All fields marked * are required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firmName" className="text-sm font-medium">Prop Firm Name *</Label>
                <Input
                  id="firmName"
                  className="h-10 rounded-xl"
                  placeholder="e.g. FTMO"
                  value={form.firmName}
                  onChange={handleChange('firmName')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5Server" className="text-sm font-medium">MT5 Server *</Label>
                <Input
                  id="mt5Server"
                  className="h-10 rounded-xl"
                  placeholder="e.g. FTMO-Server"
                  value={form.mt5Server}
                  onChange={handleChange('mt5Server')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5AccountNumber" className="text-sm font-medium">MT5 Account Number *</Label>
                <Input
                  id="mt5AccountNumber"
                  className="h-10 rounded-xl"
                  placeholder="e.g. 7654321"
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
                <Label htmlFor="phase" className="text-sm font-medium">Account Phase *</Label>
                <Select
                  value={form.phase}
                  onValueChange={(value: 'CHALLENGE' | 'FUNDED') =>
                    setForm(prev => ({ ...prev, phase: value }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="phase" className="h-10 rounded-xl">
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHALLENGE">Challenge</SelectItem>
                    <SelectItem value="FUNDED">Funded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/client/onboarding/broker')}
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
