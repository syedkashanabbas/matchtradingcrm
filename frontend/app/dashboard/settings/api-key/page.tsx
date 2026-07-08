'use client';

import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ApiKeysTable } from '@/components/dashboard/ApiKeysTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ApiKeySettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage your API keys and access tokens
          </p>
        </div>
        <Button className="gap-2" size="lg">
          <Plus className="h-5 w-5" />
          Create New Key
        </Button>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <span className="font-semibold">Tip:</span> Keep your API keys secure.
          Never share them in public or commit them to version control.
        </p>
      </div>

      {/* API Keys Table */}
      <ApiKeysTable
        apiKeys={user.apiKeys}
        onDelete={(id) => console.log("Delete key", id)}
      />
    </div>
  );
}
