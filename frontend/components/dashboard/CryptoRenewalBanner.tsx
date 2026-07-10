'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

const RENEWAL_WINDOW_DAYS = 10;

/**
 * Renewal banner for expiring crypto subscriptions (spec 3.7): crypto has no
 * recurring charge, so we surface the expiry and a one-click renewal order.
 */
export function CryptoRenewalBanner() {
  const [subscription, setSubscription] = useState<{
    plan: string;
    provider: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    status: string;
  } | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    apiClient
      .getCurrentSubscription()
      .then(response => setSubscription((response.data as any) ?? null))
      .catch(() => {});
  }, []);

  if (!subscription || subscription.provider !== 'coingate' || subscription.cancelAtPeriodEnd) {
    return null;
  }

  const daysLeft = Math.ceil(
    (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (24 * 3600 * 1000)
  );

  const isExpiredOrGrace = subscription.status !== 'ACTIVE';
  if (!isExpiredOrGrace && (daysLeft > RENEWAL_WINDOW_DAYS || daysLeft < 0)) {
    return null;
  }

  const renew = async () => {
    setIsRenewing(true);
    try {
      const response = await apiClient.createCheckoutSession(subscription.plan, 'crypto', 'renewal');
      if (response.url) window.location.href = response.url;
    } catch (error) {
      console.error('Renewal checkout failed:', error);
      setIsRenewing(false);
    }
  };

  const isCritical = isExpiredOrGrace || daysLeft <= 3;

  return (
    <div
      className={`animate-fade-in-up flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        isCritical
          ? 'border-destructive/25 bg-destructive/10'
          : 'border-warning/25 bg-warning/15'
      }`}
    >
      <div
        className={`flex items-center gap-3 text-sm font-medium ${
          isCritical ? 'text-destructive' : 'text-warning'
        }`}
      >
        <Clock className="h-5 w-5 shrink-0" />
        <span>
          {isExpiredOrGrace
            ? 'Your crypto subscription has expired — renew now to keep your service running.'
            : `Your crypto subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Crypto payments don't renew automatically.`}
        </span>
      </div>
      <Button size="sm" className="shrink-0 self-start sm:self-auto" onClick={renew} disabled={isRenewing}>
        {isRenewing ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <span aria-hidden>₿ </span>
        )}
        Renew now
      </Button>
    </div>
  );
}
