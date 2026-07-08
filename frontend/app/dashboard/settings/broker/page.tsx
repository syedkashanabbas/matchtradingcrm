'use client';

import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockBrokerData } from '@/lib/mock-data';

export default function BrokerSettingsPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Broker Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your broker connection
        </p>
      </div>

      {/* Broker Info */}
      <Card>
        <CardHeader>
          <CardTitle>Broker Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Broker Name</label>
                <p className="text-foreground mt-2 font-semibold">{mockBrokerData.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MT5 Account</label>
                <p className="text-foreground mt-2 font-mono text-sm">{mockBrokerData.mt5Account}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MT5 Server</label>
                <p className="text-foreground mt-2">{mockBrokerData.mt5Server}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant="default" className="mt-2">
                  {mockBrokerData.status}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="default">Edit Broker</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
