'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface CryptoOrderStatus {
  id: string;
  planCode: string;
  amount: string;
  currency: string;
  status: string;
  purpose: string;
  paymentUrl: string | null;
}

/**
 * Crypto payment outcome page (spec §6.2): polls the order status until
 * CoinGate confirms (or the order expires/fails).
 */
export default function CryptoPaymentResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');

  const [order, setOrder] = useState<CryptoOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await apiClient.getCryptoOrder(orderId);
      setOrder((response.data ?? null) as CryptoOrderStatus | null);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const isPending = order && ['new', 'pending', 'confirming'].includes(order.status);

  // Poll while the payment is pending/confirming
  useEffect(() => {
    if (!isPending) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [isPending, load]);

  if (!orderId) {
    return (
      <div className="mx-auto mt-8 max-w-xl animate-fade-in-up">
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Missing order reference.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-xl animate-fade-in-up">
      <Card>
        <CardContent className="space-y-5 py-12 text-center">
          {error && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="font-display text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">{error}</p>
            </>
          )}

          {!error && !order && (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="h-7 w-7 animate-spin" aria-label="Loading order status" />
            </div>
          )}

          {!error && order && order.status === 'paid' && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="font-display text-xl font-semibold text-foreground">Payment confirmed!</h1>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Your {order.planCode} {order.purpose === 'renewal' ? 'renewal' : 'subscription'} of{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {Number(order.amount)} {order.currency}
                </span>{' '}
                is confirmed.
              </p>
              <Button
                onClick={() =>
                  router.push(
                    order.purpose === 'renewal'
                      ? '/dashboard/settings/subscription'
                      : '/dashboard/client/onboarding/broker'
                  )
                }
              >
                Continue
              </Button>
            </>
          )}

          {!error && order && isPending && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Clock className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="font-display text-xl font-semibold text-foreground">Waiting for confirmation…</h1>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Your crypto payment is being {order.status === 'confirming' ? 'confirmed on-chain' : 'processed'}.
                This page updates automatically - you can also close it safely; we'll activate your
                subscription as soon as the payment confirms.
              </p>
              {order.paymentUrl && order.status === 'new' && (
                <Button variant="outline" onClick={() => (window.location.href = order.paymentUrl!)}>
                  Reopen payment page
                </Button>
              )}
            </>
          )}

          {!error && order && ['expired', 'invalid', 'canceled'].includes(order.status) && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
                <AlertTriangle className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="font-display text-xl font-semibold text-foreground">Payment {order.status}</h1>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                The payment was not completed. You can start a new checkout at any time.
              </p>
              <Button onClick={() => router.push('/dashboard/client/onboarding/payment')}>
                Try again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
