const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

import type { CurrentUser, Notification, AdminStats, User } from './types';
import type { ClientDashboardData } from './client-dashboard-hook';

export interface ProvisioningStatus {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ACTIVE' | 'ERROR' | 'DECOMMISSIONED';
  detail?: string;
  completedSteps: string[];
  failedStep?: string | null;
  hedgeStatus: 'active' | 'paused' | 'archived' | null;
  updatedAt: string | null;
}

export type OnboardingStepId = 'payment' | 'broker' | 'prop';
export type OnboardingStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface OnboardingStatus {
  progress: string;
  userStatus: string;
  completed: boolean;
  nextStep: OnboardingStepId | null;
  steps: {
    payment: { status: OnboardingStepStatus; data: { plan: string; status: string; currentPeriodEnd: string } | null };
    broker: {
      status: OnboardingStepStatus;
      data: { id: string; brokerName: string; mt5AccountNumber: string; mt5Server: string; mt5Password: string | null } | null;
    };
    prop: {
      status: OnboardingStepStatus;
      data: { id: string; firmName: string; mt5AccountNumber: string; mt5Server: string; phase: string; mt5Password: string | null } | null;
    };
  };
}

class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/api${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);

      // Access token expired: refresh once and retry the original request
      if (response.status === 401 && token && !isRetry && !endpoint.startsWith('/auth/')) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          return this.request<T>(endpoint, options, true);
        }
        this.handleSessionExpired();
      }

      const data = await response.json();

      if (!response.ok) {
        // New endpoints: { success:false, error:{code,message} }; legacy: { message }
        throw new Error(data?.error?.message || data?.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Single-flight refresh: concurrent 401s share one refresh call
  private refreshAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const raw = sessionStorage.getItem('auth-user');
          if (!raw) return null;
          const userData = JSON.parse(raw);
          if (!userData.refreshToken) return null;

          const res = await fetch(`${this.baseURL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: userData.refreshToken }),
          });
          if (!res.ok) return null;

          const data = await res.json();
          if (!data?.accessToken) return null;

          userData.accessToken = data.accessToken;
          sessionStorage.setItem('auth-user', JSON.stringify(userData));
          return data.accessToken as string;
        } catch {
          return null;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }
    return this.refreshPromise;
  }

  private handleSessionExpired() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('auth-user');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?expired=1';
    }
  }

  getAuthTokenPublic(): string | null {
    return this.getAuthToken();
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      const user = sessionStorage.getItem('auth-user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          return userData.accessToken || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  // Generic POST method
  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    password: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    refCode?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Notifications endpoints
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return this.request('/notifications');
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  // Admin endpoints
  async getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  async getAllUsers() {
    return this.request('/admin/users');
  }

  async getAllBrokers() {
    return this.request('/admin/brokers');
  }

  async getAllPropFirms() {
    return this.request('/admin/prop-firms');
  }

  async updateBrokerStatus(brokerId: string, status: string) {
    return this.request(`/admin/brokers/${brokerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updatePropFirmStatus(propId: string, status: string) {
    return this.request(`/admin/prop-firms/${propId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateUserStatus(userId: string, status: string) {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Client dashboard endpoints
  async getClientDashboard(): Promise<ClientDashboardData> {
    return this.request('/client/dashboard') as Promise<ClientDashboardData>;
  }

  async getSubscriptionInfo() {
    return this.request('/client/subscription');
  }

  async updateProfile(data: { firstName?: string; lastName?: string; phone?: string; company?: string }) {
    return this.request('/client/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Billing endpoints
  async createCheckoutSession(plan: string, method: 'card' | 'crypto' = 'card', purpose?: 'renewal') {
    return this.request('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, method, purpose }),
    });
  }

  async getInvoices() {
    return this.request('/subscriptions/invoices');
  }

  async createPortalSession() {
    return this.request('/subscriptions/portal', { method: 'POST' });
  }

  async getCryptoOrder(orderId: string) {
    return this.request(`/subscriptions/crypto-orders/${orderId}`);
  }

  async getCurrentSubscription() {
    return this.request('/subscriptions/current');
  }

  async cancelSubscription() {
    return this.request('/subscriptions/cancel', {
      method: 'POST',
    });
  }

  async reactivateSubscription() {
    return this.request('/subscriptions/reactivate', {
      method: 'POST',
    });
  }

  async getSubscriptionPlans() {
    return this.request('/subscriptions/plans');
  }

  // Broker endpoints
  async getBrokerList() {
    return this.request('/broker');
  }

  async createBroker(brokerData: any) {
    return this.request('/broker', {
      method: 'POST',
      body: JSON.stringify(brokerData),
    });
  }

  async getBroker(id: string) {
    return this.request(`/broker/${id}`);
  }

  async updateBroker(id: string, brokerData: any) {
    return this.request(`/broker/${id}`, {
      method: 'PUT',
      body: JSON.stringify(brokerData),
    });
  }

  async deleteBroker(id: string) {
    return this.request(`/broker/${id}`, {
      method: 'DELETE',
    });
  }

  async validateBroker(id: string) {
    return this.request(`/broker/${id}/validate`, {
      method: 'POST',
    });
  }

  // Prop endpoints
  async getPropList(includeArchived = false) {
    return this.request(`/prop${includeArchived ? '?includeArchived=true' : ''}`);
  }

  async createProp(propData: any) {
    return this.request('/prop', {
      method: 'POST',
      body: JSON.stringify(propData),
    });
  }

  async getProp(id: string) {
    return this.request(`/prop/${id}`);
  }

  async updateProp(id: string, propData: any) {
    return this.request(`/prop/${id}`, {
      method: 'PUT',
      body: JSON.stringify(propData),
    });
  }

  async archiveProp(id: string) {
    return this.request(`/prop/${id}/archive`, {
      method: 'POST',
    });
  }

  async validateProp(id: string) {
    return this.request(`/prop/${id}/validate`, {
      method: 'POST',
    });
  }

  async updatePropPhase(id: string, phase: string) {
    return this.request(`/prop/${id}/phase`, {
      method: 'PUT',
      body: JSON.stringify({ phase }),
    });
  }

  // Onboarding endpoints (D3: wizard wired to /api/v1/onboarding/*)
  async getOnboardingStatus(): Promise<ApiResponse<OnboardingStatus>> {
    return this.request('/v1/onboarding/status');
  }

  async saveOnboardingBroker(data: {
    brokerName: string;
    mt5AccountNumber: string;
    mt5Password: string;
    mt5Server: string;
    brokerPortalPassword?: string;
  }) {
    return this.request('/v1/onboarding/broker', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveOnboardingProp(data: {
    firmName: string;
    mt5AccountNumber: string;
    mt5Password: string;
    mt5Server: string;
    phase?: 'CHALLENGE' | 'FUNDED';
  }) {
    return this.request('/v1/onboarding/prop', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAuthMe() {
    return this.request('/auth/me');
  }

  // Config endpoints
  async getSupportedBrokers() {
    return this.request('/broker/supported');
  }

  async getSupportedPropFirms() {
    return this.request('/prop/supported');
  }

  async getAdminUserDetail(userId: string) {
    return this.request(`/admin/users/${userId}`);
  }

  async getAdminSubscriptions() {
    return this.request('/admin/subscriptions');
  }

  // Provisioning endpoints (M2)
  async getProvisioningStatus(): Promise<ApiResponse<ProvisioningStatus>> {
    return this.request('/provisioning/status');
  }

  async adminListProvisions(status?: string) {
    return this.request(`/admin/provisioning${status ? `?status=${status}` : ''}`);
  }

  async adminProvisionDetail(userId: string) {
    return this.request(`/admin/provisioning/${userId}`);
  }

  async adminRetryProvision(userId: string) {
    return this.request(`/admin/provisioning/${userId}/retry`, { method: 'POST' });
  }

  async adminReprovision(userId: string) {
    return this.request(`/admin/provisioning/${userId}/reprovision`, { method: 'POST' });
  }

  async adminServiceStart(userId: string) {
    return this.request(`/admin/service/${userId}/start`, { method: 'POST' });
  }

  async adminServiceStop(userId: string) {
    return this.request(`/admin/service/${userId}/stop`, { method: 'POST' });
  }

  async adminServiceDelete(userId: string) {
    return this.request(`/admin/service/${userId}/delete`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  }

  async adminServiceStatus(userId: string) {
    return this.request(`/admin/service/${userId}/status`);
  }

  async adminRevealCredentials(userId: string, accountType: 'broker' | 'prop', accountId: string) {
    return this.request(`/admin/users/${userId}/credentials/${accountType}/${accountId}/reveal`, {
      method: 'POST',
    });
  }

  // Broker lifecycle (M2)
  async replaceBroker(id: string, data: {
    brokerName: string;
    mt5AccountNumber: string;
    mt5Password: string;
    mt5Server: string;
    brokerPortalPassword?: string;
  }) {
    return this.request(`/broker/${id}/replace`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async setHedgeBroker(brokerAccountId: string) {
    return this.request('/broker/hedge-broker', {
      method: 'POST',
      body: JSON.stringify({ brokerAccountId }),
    });
  }

  // Commission endpoints (M4)
  async getAgentCommissions(filters?: { from?: string; to?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    return this.request(`/network/commissions${query ? `?${query}` : ''}`);
  }

  async getDownlineClients() {
    return this.request('/network/downline-clients');
  }

  // Exonoma network engine (spec v1.1 §7.9)
  async getQualification() {
    return this.request('/network/qualification');
  }

  async getChallenges() {
    return this.request('/network/challenges');
  }

  async getTravelPromos() {
    return this.request('/network/promos');
  }

  async adminGetChallenges() {
    return this.request('/admin/challenges');
  }

  async adminSaveChallenge(data: { id?: string; name: string; metric: string; prize: string; startsAt: string; endsAt: string }) {
    return this.request(data.id ? `/admin/challenges/${data.id}` : '/admin/challenges', {
      method: data.id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminFreezeChallenge(id: string) {
    return this.request(`/admin/challenges/${id}/freeze`, { method: 'POST' });
  }

  async adminGetPromos() {
    return this.request('/admin/promos');
  }

  async adminSavePromo(data: { id?: string; name: string; metric: string; threshold: number; deadline: string }) {
    return this.request(data.id ? `/admin/promos/${data.id}` : '/admin/promos', {
      method: data.id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminSetPromoProgress(promoId: string, userId: string, status: string) {
    return this.request(`/admin/promos/${promoId}/progress/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async adminGetMemberships() {
    return this.request('/admin/network/memberships');
  }

  async adminGetCommissionPlan() {
    return this.request('/admin/commissions/plan');
  }

  async adminSaveCommissionPlan(data: {
    name: string;
    isActive: boolean;
    levels: Array<{ level: number; rate: number; minActiveDirects?: number }>;
  }) {
    return this.request('/admin/commissions/plan', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminGetCommissionReport(filters?: { from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const query = params.toString();
    return this.request(`/admin/commissions${query ? `?${query}` : ''}`);
  }

  async adminGetAgentCommissions(agentId: string) {
    return this.request(`/admin/commissions/agent/${agentId}`);
  }

  async adminListPayoutBatches() {
    return this.request('/admin/commissions/payout-batches');
  }

  async adminCreatePayoutBatch(periodStart: string, periodEnd: string) {
    return this.request('/admin/commissions/payout-batch', {
      method: 'POST',
      body: JSON.stringify({ periodStart, periodEnd }),
    });
  }

  async adminMarkPayoutBatchPaid(batchId: string) {
    return this.request(`/admin/commissions/payout-batch/${batchId}/mark-paid`, { method: 'POST' });
  }

  /** Downloads the payout batch CSV (needs the auth header, so no plain link). */
  async adminDownloadPayoutBatchCsv(batchId: string): Promise<Blob> {
    const token = this.getAuthTokenPublic();
    const response = await fetch(`${this.baseURL}/api/admin/commissions/payout-batch/${batchId}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error(`Export failed (${response.status})`);
    }
    return response.blob();
  }

  // Network endpoints
  async getMyReferralLink() {
    return this.request('/network/my-referral-link');
  }

  async getMyNetworkTree() {
    return this.request('/network/my-tree');
  }

  async getDirectReferrals() {
    return this.request('/network/direct-referrals');
  }

  async getNetworkStats() {
    return this.request('/network/stats');
  }

  async getNetworkLeaderboard() {
    return this.request('/network/leaderboard');
  }

  async getNetworkActivityFeed() {
    return this.request('/network/activity-feed');
  }

  // Get inviter information by referral code
  async getInviterInfo(refCode: string) {
    return this.request(`/network/inviter/${refCode}`);
  }
}

export const apiClient = new ApiClient();
