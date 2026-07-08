'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ApiKeysTable } from '@/components/dashboard/ApiKeysTable';
import { apiClient } from '@/lib/api';
import { Plus, Key } from 'lucide-react';
import type { ApiKey } from '@/lib/types';

export default function ApiKeysPage() {
  const { isLoading } = useAuthContext();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load API keys on component mount
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const response = await apiClient.getApiKeys();
        // Transform backend response to frontend format
        const transformedKeys: ApiKey[] = response.apiKeys.map((key: any) => ({
          id: key.id,
          name: key.name,
          key: key.key, // This will be the raw key returned only once during creation
          lastFour: key.key.slice(-4), // Last 4 characters of the key
          created: new Date(key.createdAt).toISOString().split('T')[0],
          lastUsed: new Date(key.createdAt).toISOString().split('T')[0], // Use created date as last used for now
          status: 'active' as const,
        }));
        setApiKeys(transformedKeys);
      } catch (error) {
        console.error('Failed to load API keys:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      loadApiKeys();
    }
  }, [isLoading]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const response = await apiClient.createApiKey(newKeyName);
      
      // Transform and add the new key to the list
      const newKey: ApiKey = {
        id: response.apiKey.id,
        name: response.apiKey.name,
        key: response.apiKey.key, // Store the full key (shown only once)
        lastFour: response.apiKey.key.slice(-4),
        created: new Date(response.apiKey.createdAt).toISOString().split('T')[0],
        lastUsed: new Date(response.apiKey.createdAt).toISOString().split('T')[0],
        status: 'active' as const,
      };

      setApiKeys([newKey, ...apiKeys]);
      setNewKeyName('');
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      alert(error.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      try {
        await apiClient.deleteApiKey(id);
        setApiKeys(apiKeys.filter(key => key.id !== id));
      } catch (error: any) {
        console.error('Failed to delete API key:', error);
        alert(error.message || 'Failed to delete API key');
      }
    }
  };

  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            API Keys
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your API keys for secure access
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Create API Key
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Create New API Key
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={isCreating}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 rounded-lg border border-input px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateKey}
                  disabled={isCreating || !newKeyName.trim()}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* API Keys Table */}
      {apiKeys.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-soft-md overflow-hidden">
          <ApiKeysTable apiKeys={apiKeys} onDelete={handleDeleteKey} />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/50 p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Key className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No API Keys Yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
            Create your first API key to get started with our API
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create API Key
          </button>
        </div>
      )}
    </div>
  );
}
