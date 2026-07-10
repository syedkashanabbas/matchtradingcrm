'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface StatusDropdownProps {
  currentStatus: string;
  itemId: string;
  moduleType: 'broker' | 'propFirm';
  onStatusUpdate?: (newStatus: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'review', label: 'Review' },
  { value: 'active', label: 'Active' },
  { value: 'failed', label: 'Failed' },
  { value: 'archived', label: 'Archived' },
];

export function StatusDropdown({ currentStatus, itemId, moduleType, onStatusUpdate }: StatusDropdownProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || isUpdating) return;

    setIsUpdating(true);

    try {
      let response;

      switch (moduleType) {
        case 'broker':
          response = await apiClient.updateBrokerStatus(itemId, newStatus);
          break;
        case 'propFirm':
          response = await apiClient.updatePropFirmStatus(itemId, newStatus);
          break;
        default:
          throw new Error('Invalid module type');
      }

      if (response) {
        setStatus(newStatus);
        onStatusUpdate?.(newStatus);

        // Show success message (you can implement toast notifications here)
        console.log(`${moduleType} status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error(`Failed to update ${moduleType} status:`, error);
      // Revert to original status on error
      setStatus(currentStatus);
      // Show error message (you can implement toast notifications here)
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        aria-label={`Update ${moduleType === 'broker' ? 'broker' : 'prop firm'} status`}
        className={`h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          isUpdating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted/50'
        }`}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-background text-foreground">
            {option.label}
          </option>
        ))}
      </select>

      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
          <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-current"></div>
        </div>
      )}
    </div>
  );
}
