'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { CryptoRenewalBanner } from '@/components/dashboard/CryptoRenewalBanner';
import {
  CreditCard,
  Receipt,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Bitcoin,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface SubscriptionData {
  id: string;
  provider: 'stripe' | 'coingate';
  plan: string;
  planName?: string;
  price?: string | null;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  gracePeriodEnd?: string | null;
}

interface Invoice {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  url: string | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  popular?: boolean;
}

export default function SubscriptionSettingsPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [subRes, invoicesRes, plansRes] = await Promise.all([
        apiClient.getCurrentSubscription().catch(() => null),
        apiClient.getInvoices().catch(() => null),
        apiClient.getSubscriptionPlans().catch(() => null),
      ]);
      setSubscription(((subRes?.data ?? null) as SubscriptionData | null) ?? null);
      setInvoices(((invoicesRes?.data ?? []) as Invoice[]) ?? []);
      const rawPlans = (plansRes?.data ?? []) as Plan[];
      setPlans(rawPlans);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (name: string, fn: () => Promise<any>, successText?: string) => {
    setActionLoading(name);
    setMessage(null);
    try {
      const result = await fn();
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (successText) setMessage({ type: 'success', text: successText });
      await load();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || `${name} failed` });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  const isActive = subscription?.status === 'ACTIVE';
  const inGrace = subscription?.status === 'PAST_DUE';

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Settings</p>
        <h1 className="page-title">Subscription</h1>
        <p className="page-subtitle">Your plan, payments and billing history in one place.</p>
      </div>

      <CryptoRenewalBanner />

      {message && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'border-success/25 bg-success/10 text-success'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current plan */}
      <Card className="animate-fade-in-up stagger-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Current Plan</CardTitle>
            {subscription && (
              <>
                <Badge
                  className={
                    isActive
                      ? 'bg-success/15 text-success border-success/25'
                      : inGrace
                        ? 'bg-warning/15 text-warning border-warning/25'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                  }
                >
                  {subscription.status}
                </Badge>
                <Badge variant="outline">
                  {subscription.provider === 'coingate' ? 'Crypto' : 'Card'}
                </Badge>
              </>
            )}
          </div>
          {subscription?.provider === 'stripe' && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading !== null}
              onClick={() => runAction('portal', () => apiClient.createPortalSession())}
            >
              {actionLoading === 'portal' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-1" />
              )}
              Customer Portal
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-6">
              <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {subscription.planName ?? subscription.plan}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Price
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-foreground tabular-nums">
                    {subscription.price ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {subscription.provider === 'coingate' ? 'Expires' : 'Renews'}
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-foreground tabular-nums">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Auto-renew
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-foreground">
                    {subscription.provider === 'coingate'
                      ? 'Manual (crypto)'
                      : subscription.cancelAtPeriodEnd
                        ? 'Cancels at period end'
                        : 'On'}
                  </p>
                </div>
              </div>

              {inGrace && subscription.gracePeriodEnd && (
                <div className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/15 p-4 text-sm font-medium text-warning">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>
                    Your payment is overdue. Service will be suspended on{' '}
                    {new Date(subscription.gracePeriodEnd).toLocaleDateString()} unless payment is
                    completed.
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                {subscription.provider === 'coingate' && (
                  <Button
                    size="sm"
                    disabled={actionLoading !== null}
                    onClick={() =>
                      runAction('renew', () =>
                        apiClient.createCheckoutSession(subscription.plan, 'crypto', 'renewal')
                      )
                    }
                  >
                    {actionLoading === 'renew' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Bitcoin className="h-4 w-4 mr-1" />
                    )}
                    Renew with crypto
                  </Button>
                )}
                {!subscription.cancelAtPeriodEnd ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading !== null}
                    onClick={() =>
                      runAction('cancel', () => apiClient.cancelSubscription(), 'Subscription will cancel at period end')
                    }
                  >
                    Cancel at period end
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading !== null}
                    onClick={() =>
                      runAction('reactivate', () => apiClient.reactivateSubscription(), 'Auto-renewal restored')
                    }
                  >
                    Keep my subscription
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-foreground">No subscription yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a plan to unlock your dashboard and start trading.
              </p>
              <Button
                className="mt-5"
                onClick={() => (window.location.href = '/dashboard/client/onboarding/payment')}
              >
                Choose a plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan selector (upgrade/change) */}
      {subscription && plans.length > 0 && (
        <Card className="animate-fade-in-up stagger-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Change Plan</CardTitle>
            <CardDescription>
              Switching plans starts a new checkout; your current plan is replaced once payment
              completes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 transition-colors ${
                  plan.id === subscription.plan
                    ? 'border-primary bg-primary/5'
                    : 'border-border/80 bg-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display font-semibold">{plan.name}</p>
                  {plan.id === subscription.plan && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">Current</Badge>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
                  {plan.price} {plan.currency}
                  <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                </p>
                {plan.id !== subscription.plan && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full"
                    disabled={actionLoading !== null}
                    onClick={() =>
                      // Card subscriptions change plan via the Customer Portal
                      // (prevents a second parallel Stripe subscription);
                      // crypto plans switch with a new order.
                      subscription.provider === 'stripe'
                        ? runAction(`plan-${plan.id}`, () => apiClient.createPortalSession())
                        : runAction(`plan-${plan.id}`, () =>
                            apiClient.createCheckoutSession(plan.id, 'crypto')
                          )
                    }
                  >
                    {actionLoading === `plan-${plan.id}`
                      ? 'Redirecting…'
                      : subscription.provider === 'stripe'
                        ? `Switch via Customer Portal`
                        : `Switch to ${plan.name}`}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card className="animate-fade-in-up stagger-3">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Invoices</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Invoice
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Amount
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Method
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr
                      key={`${invoice.provider}-${invoice.id}`}
                      className="border-b border-border/50 transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3.5 pr-4 font-mono text-xs">{invoice.id}</td>
                      <td className="py-3.5 pr-4 tabular-nums">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-medium tabular-nums">
                        {invoice.amount} {invoice.currency}
                      </td>
                      <td className="py-3.5 pr-4">
                        {invoice.provider === 'coingate' ? 'Crypto' : 'Card'}
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            invoice.status === 'paid'
                              ? 'bg-success/15 text-success border-success/25'
                              : undefined
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-3.5">
                        {invoice.url && (
                          <a
                            href={invoice.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-foreground">No invoices yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Your billing history will appear here after your first payment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
