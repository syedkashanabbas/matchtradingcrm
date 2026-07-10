import type { UserStatus, AccountStatus, SubscriptionStatus } from '@/lib/types';

type Status = UserStatus | AccountStatus | SubscriptionStatus;

interface StatusBadgeProps {
  status: Status;
  variant?: 'default' | 'subtle';
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const getStyles = (status: Status) => {
    switch (status) {
      case 'active':
        return {
          bg: variant === 'default' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-transparent',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: variant === 'default' ? 'border-emerald-200 dark:border-emerald-800' : 'border-emerald-300 dark:border-emerald-600',
        };
      case 'suspended':
        return {
          bg: variant === 'default' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-transparent',
          text: 'text-red-700 dark:text-red-400',
          border: variant === 'default' ? 'border-red-200 dark:border-red-800' : 'border-red-300 dark:border-red-600',
        };
      case 'pending':
        return {
          bg: variant === 'default' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-transparent',
          text: 'text-amber-700 dark:text-amber-400',
          border: variant === 'default' ? 'border-amber-200 dark:border-amber-800' : 'border-amber-300 dark:border-amber-600',
        };
      case 'inactive':
        return {
          bg: variant === 'default' ? 'bg-gray-50 dark:bg-gray-900/20' : 'bg-transparent',
          text: 'text-gray-700 dark:text-gray-400',
          border: variant === 'default' ? 'border-gray-200 dark:border-gray-800' : 'border-gray-300 dark:border-gray-600',
        };
      case 'overdue':
        return {
          bg: variant === 'default' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-transparent',
          text: 'text-red-700 dark:text-red-400',
          border: variant === 'default' ? 'border-red-200 dark:border-red-800' : 'border-red-300 dark:border-red-600',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          text: 'text-gray-700 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-800',
        };
    }
  };

  const styles = getStyles(status);
  const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${styles.bg} ${styles.text} ${styles.border}`}
    >
      <span className={`h-2 w-2 rounded-full ${
        status === 'active' ? 'bg-emerald-600 dark:bg-emerald-400' :
        status === 'suspended' || status === 'overdue' ? 'bg-red-600 dark:bg-red-400' :
        status === 'pending' ? 'bg-amber-600 dark:bg-amber-400' :
        'bg-gray-600 dark:bg-gray-400'
      }`} />
      {capitalizedStatus}
    </span>
  );
}
