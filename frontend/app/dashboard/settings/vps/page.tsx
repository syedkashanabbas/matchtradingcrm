'use client';

import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockVPSData } from '@/lib/mock-data';

export default function VPSSettingsPage() {
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
        <h1 className="text-3xl font-bold text-foreground">VPS Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your VPS configuration
        </p>
      </div>

      {/* VPS Info */}
      <Card>
        <CardHeader>
          <CardTitle>VPS Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Provider</label>
                <p className="text-foreground mt-2 font-semibold">{mockVPSData.provider}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                <p className="text-foreground mt-2 font-mono text-sm">{mockVPSData.ipAddress}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Operating System</label>
                <p className="text-foreground mt-2">{mockVPSData.operatingSystem}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant="default" className="mt-2">
                  {mockVPSData.status}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="default">Edit VPS</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
