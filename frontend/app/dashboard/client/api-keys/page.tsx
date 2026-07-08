'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks';
import { apiClient } from '@/lib/api';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ApiKeysTable } from '@/components/dashboard/ApiKeysTable';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Check } from 'lucide-react';
import type { ApiKey } from '@/lib/types';

export default function ApiKeysPage() {
  const { user, isLoading } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.apiKeys) {
      setApiKeys(user.apiKeys);
    }
  }, [user]);

  const handleCreateKey = async () => {
    setIsCreating(true);
    try {
      const response = await apiClient.createApiKey('API Key');
      if (response.apiKey) {
        const newKey: ApiKey = {
          id: response.apiKey.id || Date.now().toString(),
          name: response.apiKey.name || 'API Key',
          key: response.apiKey.key || 'Generated key...',
          lastFour: response.apiKey.lastFour || response.apiKey.key?.slice(-4) || '....',
          prefix: response.apiKey.prefix || response.apiKey.key?.substring(0, 8) + '...',
          environment: response.apiKey.environment || 'Live',
          status: response.apiKey.status || 'active',
          created: response.apiKey.created || new Date().toISOString(),
          lastUsed: response.apiKey.lastUsed || new Date().toISOString(),
        };
        setApiKeys(prev => [newKey, ...prev]);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await apiClient.deleteApiKey(id);
      setApiKeys(prev => prev.filter(key => key.id !== id));
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

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
        <Button 
          onClick={handleCreateKey}
          disabled={isCreating}
          className="gap-2" 
          size="lg"
        >
          <Plus className="h-5 w-5" />
          {isCreating ? 'Creating...' : 'Create New Key'}
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
        apiKeys={apiKeys}
        onCopyKey={handleCopyKey}
        onDelete={handleDeleteKey}
      />
    </div>
  );
}
