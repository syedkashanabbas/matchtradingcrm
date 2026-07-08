'use client';

import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockPropFirmData } from '@/lib/mock-data';

export default function PropFirmSettingsPage() {
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
        <h1 className="text-3xl font-bold text-foreground">Prop Firm Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your prop firm account
        </p>
      </div>

      {/* Prop Firm Info */}
      <Card>
        <CardHeader>
          <CardTitle>Prop Firm Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prop Firm Name</label>
                <p className="text-foreground mt-2 font-semibold">{mockPropFirmData.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                <p className="text-foreground mt-2 font-mono text-sm">{mockPropFirmData.accountNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Server</label>
                <p className="text-foreground mt-2">{mockPropFirmData.server}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phase</label>
                <Badge variant="default" className="mt-2">
                  {mockPropFirmData.phase}
                </Badge>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant="default" className="mt-2">
                  {mockPropFirmData.status}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="default">Edit Prop Firm</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
