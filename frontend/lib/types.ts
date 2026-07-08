export type UserStatus = 'active' | 'suspended' | 'pending';
export type UserTier = 'Basic' | 'Pro' | 'Enterprise';
export type UserRole = 'CLIENT' | 'ADMIN';
export type ApiKeyStatus = 'active' | 'revoked';
export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type AccountStatus = 'active' | 'suspended' | 'pending';
export type SubscriptionStatus = 'active' | 'inactive' | 'overdue';

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  tier: UserTier;
  signupDate: string;
  avatar: string;
}

export interface CurrentUser extends User {
  apiKeys: ApiKey[];
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  joinDate: string;
  role: UserRole;
  accountId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastFour: string;
  created: string;
  lastUsed: string;
  status: ApiKeyStatus;
  prefix?: string;
  environment?: 'Live' | 'Test';
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  read: boolean;
  timestamp: string;
  type: NotificationType;
}

export interface DashboardStats {
  totalUsers?: number;
  activeUsers: number;
  newUsersThisMonth?: number;
  suspendedUsers?: number;
  apiCallsUsed?: number;
  apiCallsLimit?: number;
  accountStatus: AccountStatus;
  subscriptionStatus: SubscriptionStatus;
  lastActivity: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
  totalSubscriptions?: number;
  activeSubscriptions?: number;
  totalVpsConfigs?: number;
  activeVpsConfigs?: number;
  totalBrokerAccounts?: number;
  activeBrokerAccounts?: number;
  totalPropAccounts?: number;
  activePropAccounts?: number;
  signupGrowth?: Array<{ month: string; value: number }>;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
}
