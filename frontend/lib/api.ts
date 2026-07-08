const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

import type { CurrentUser, ApiKey, Notification, AdminStats, User } from './types';
import type { ClientDashboardData } from './client-dashboard-hook';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
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

  async register(firstName: string, lastName: string, email: string, phone: string, password: string, refCode?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, phone, password, refCode }),
    });
  }

  // API Keys endpoints
  async getApiKeys() {
    return this.request('/apikeys');
  }

  async createApiKey(name: string) {
    return this.request('/apikeys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteApiKey(id: string) {
    return this.request(`/apikeys/${id}`, {
      method: 'DELETE',
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

  async getAllVps() {
    return this.request('/admin/vps');
  }

  async getAllBrokers() {
    return this.request('/admin/brokers');
  }

  async getAllPropFirms() {
    return this.request('/admin/prop-firms');
  }

  async updateVpsStatus(vpsId: string, status: string) {
    return this.request(`/admin/vps/${vpsId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
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
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // EA Verification endpoint
  async verifyEaAccess(apiKey: string, deviceId: string) {
    return this.request('/ea/verify', {
      method: 'POST',
      body: JSON.stringify({ apiKey, deviceId }),
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
  async createCheckoutSession(plan?: string) {
    return this.request('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
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

  // VPS endpoints
  async getVpsList() {
    return this.request('/vps');
  }

  async createVps(vpsData: any) {
    return this.request('/vps', {
      method: 'POST',
      body: JSON.stringify(vpsData),
    });
  }

  async getVps(id: string) {
    return this.request(`/vps/${id}`);
  }

  async updateVps(id: string, vpsData: any) {
    return this.request(`/vps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vpsData),
    });
  }

  async deleteVps(id: string) {
    return this.request(`/vps/${id}`, {
      method: 'DELETE',
    });
  }

  async testVps(id: string) {
    return this.request(`/vps/${id}/test`, {
      method: 'POST',
    });
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
  async getPropList() {
    return this.request('/prop');
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

  // Onboarding endpoints
  async getOnboardingStatus() {
    return this.request('/v1/onboarding/status');
  }

  async getClientOnboarding() {
    return this.request('/v1/onboarding/status');
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
