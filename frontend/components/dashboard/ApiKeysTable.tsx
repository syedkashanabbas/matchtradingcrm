'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { ApiKey } from '@/lib/types';

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  onDelete?: (id: string) => void;
  onCopyKey?: (key: string, id: string) => void;
}

export function ApiKeysTable({
  apiKeys = [],
  onDelete,
  onCopyKey,
}: ApiKeysTableProps) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4">Prefix</th>
            <th className="py-3 px-4">Environment</th>
            <th className="py-3 px-4">Created Date</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {apiKeys.map((key) => (
            <tr
              key={key.id}
              className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <td className="py-4 px-4">
                <span className="font-medium text-foreground">{key.name}</span>
              </td>
              <td className="py-4 px-4">
                <code className="bg-muted px-3 py-1 rounded text-sm text-foreground font-mono">
                  {key.prefix || key.lastFour}
                </code>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-muted-foreground">
                  {key.environment || 'Live'}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-muted-foreground">
                  {new Date(key.created).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </td>
              <td className="py-4 px-4">
                <StatusBadge status={key.status} variant="subtle" />
              </td>
              <td className="py-4 px-4">
                {key.status === "active" && (
                  <button
                    onClick={() => onDelete?.(key.id)}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
