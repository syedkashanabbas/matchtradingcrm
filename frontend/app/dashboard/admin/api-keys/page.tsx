'use client';

import { useState, useMemo, useEffect } from 'react';
import { Key, Search, MoreVertical } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiClient } from '@/lib/api';

interface ApiKey {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  name: string;
  prefix: string;
  environment: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
  usageCount: number;
}

export default function AdminApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      // Get all users
      const usersResponse = await apiClient.getAllUsers();
      const users = usersResponse.users || [];

      // For each user, get their API keys
      const keyPromises = users.map(async (user: any) => {
        try {
          const keysResponse = await apiClient.getApiKeys();
          const keys = (keysResponse as any).apiKeys || [];
          
          return keys.map((key: any) => ({
            id: key.id,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            name: key.name,
            prefix: key.prefix,
            environment: key.environment || 'Live',
            isActive: key.isActive,
            createdAt: key.createdAt,
            lastUsedAt: key.lastUsedAt,
            usageCount: key.usageCount
          }));
        } catch (error) {
          return [];
        }
      });

      const keyDataArrays = await Promise.all(keyPromises);
      const allKeys = keyDataArrays.flat();
      setApiKeys(allKeys);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredKeys = useMemo(() => {
    return apiKeys.filter(key =>
      (key.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (key.prefix?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (key.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [apiKeys, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Key className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          API Keys Monitoring
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor all API keys across users
        </p>
      </div>

      {/* API Keys Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft-md overflow-hidden">
        {/* Search Bar */}
        <div className="border-b border-border p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by key name, prefix or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground bg-muted/30">
                <th className="py-3 px-6">User</th>
                <th className="py-3 px-6">Key Name</th>
                <th className="py-3 px-6">Prefix</th>
                <th className="py-3 px-6">Environment</th>
                <th className="py-3 px-6">Created</th>
                <th className="py-3 px-6">Last Used</th>
                <th className="py-3 px-6">Usage</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-foreground">{key.userName}</p>
                      <p className="text-xs text-muted-foreground">{key.userEmail}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-foreground">{key.name}</span>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded text-foreground">
                      {key.prefix}
                    </code>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      {key.environment}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
                      {new Date(key.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
                      {new Date(key.lastUsedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">{key.usageCount}</span>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={key.isActive ? 'active' : 'suspended'} variant="subtle" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredKeys.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No API keys found</p>
          </div>
        )}
      </div>
    </div>
  );
}
