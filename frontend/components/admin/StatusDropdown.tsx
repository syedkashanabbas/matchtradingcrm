'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface StatusDropdownProps {
  currentStatus: string;
  itemId: string;
  moduleType: 'vps' | 'broker' | 'propFirm';
  onStatusUpdate?: (newStatus: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'REVIEW', label: 'REVIEW', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', badgeColor: '#f59e0b' },
  { value: 'PENDING', label: 'PENDING', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', badgeColor: '#3b82f6' },
  { value: 'CERTIFIED', label: 'CERTIFIED', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', badgeColor: '#10b981' },
  { value: 'ACTIVE', label: 'ACTIVE', color: 'bg-green-500 dark:bg-green-600 text-white', badgeColor: '#22c55e' },
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
        case 'vps':
          response = await apiClient.updateVpsStatus(itemId, newStatus);
          break;
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

  const currentStatusOption = STATUS_OPTIONS.find(option => option.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all ${
          currentStatusOption.color
        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
        style={{ 
          backgroundColor: currentStatusOption.badgeColor,
          color: status === 'ACTIVE' ? 'white' : 'inherit'
        }}
      >
        {STATUS_OPTIONS.map((option) => (
          <option 
            key={option.value} 
            value={option.value} 
            className="bg-background text-foreground"
            style={{ 
              backgroundColor: option.badgeColor,
              color: option.value === 'ACTIVE' ? 'white' : 'inherit'
            }}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
        </div>
      )}
    </div>
  );
}
