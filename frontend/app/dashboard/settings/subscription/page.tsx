'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-hook';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SubscriptionSettingsPage() {
  const { isLoading: authLoading } = useAuthContext();
  const { subscription, isLoading: subLoading, error, upgradePlan } = useSubscription();

  if (authLoading || subLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Error loading subscription: {error}
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700">
          Subscription information not available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing
        </p>
      </div>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Plan Name</label>
                <p className="text-foreground mt-2 font-semibold">{subscription.plan}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                  {subscription.status}
                </Badge>
              </div>
              {subscription.nextBillingDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Next Billing Date</label>
                  <p className="text-foreground mt-2">
                    {new Date(subscription.nextBillingDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {subscription.subscriptionEnd && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subscription Ends</label>
                  <p className="text-foreground mt-2">
                    {new Date(subscription.subscriptionEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Plan Features</label>
              <ul className="mt-2 space-y-1">
                {subscription.features.map((feature, index) => (
                  <li key={index} className="text-foreground flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <Button variant="default" onClick={upgradePlan}>
                Upgrade Plan
              </Button>
              {subscription.status === 'active' && (
                <Button variant="outline">
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
