export const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    status: 'active' as const,
    tier: 'Pro' as const,
    signupDate: '2024-01-15',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    status: 'active' as const,
    tier: 'Enterprise' as const,
    signupDate: '2024-02-10',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    status: 'suspended' as const,
    tier: 'Basic' as const,
    signupDate: '2024-01-20',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    status: 'active' as const,
    tier: 'Pro' as const,
    signupDate: '2024-03-01',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    status: 'pending' as const,
    tier: 'Basic' as const,
    signupDate: '2024-03-02',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  },
];

export const mockApiKeys = [
  {
    id: '1',
    name: 'Live API',
    key: 'dave_live_a8KxR7mN2pQ9',
    lastFour: 'a8Kx',
    created: '2026-02-07',
    lastUsed: '2026-03-04',
    status: 'active' as const,
    prefix: 'dave_live_a8Kx',
    environment: 'Live' as const,
  },
];

export const mockNotifications = [
  {
    id: '1',
    title: 'VPS connected successfully',
    description: 'Your VPS has been connected and is ready to use',
    read: false,
    timestamp: '2026-02-10T12:00:00Z',
    type: 'success' as const,
  },
  {
    id: '2',
    title: 'Broker account synced',
    description: 'Your Vantage broker account has been synced',
    read: true,
    timestamp: '2026-02-09T10:30:00Z',
    type: 'success' as const,
  },
  {
    id: '3',
    title: 'API key generated',
    description: 'Your new API key has been generated successfully',
    read: true,
    timestamp: '2026-02-08T14:22:00Z',
    type: 'info' as const,
  },
];

export const mockCurrentUser = {
  id: 'current-user-1',
  name: 'John Carter',
  email: 'john@email.com',
  firstName: 'John',
  lastName: 'Carter',
  phone: '+1 (555) 123-4567',
  company: 'Carter Trading',
  status: 'active' as const,
  tier: 'Pro' as const,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  joinDate: '2024-01-15',
  role: 'CLIENT' as const,
  accountId: '10345',
  apiKeys: [
    {
      id: '1',
      name: 'Live API',
      key: 'dave_live_a8KxR7mN2pQ9',
      lastFour: 'a8Kx',
      created: '2026-02-07',
      lastUsed: '2026-03-04',
      status: 'active' as const,
    },
  ],
};

// Admin user for testing - uncomment the role line in mockCurrentUser to switch to admin
export const mockAdminUser = {
  id: 'admin-user-1',
  name: 'Admin User',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  phone: '+1 (555) 000-0000',
  company: 'MatchTrading Inc',
  status: 'active' as const,
  tier: 'Enterprise' as const,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
  joinDate: '2023-01-01',
  role: 'ADMIN' as const,
};

export const mockDashboardStats = {
  accountStatus: 'Active' as const,
  vpsStatus: 'Connected',
  broker: 'Vantage',
  propFirm: 'Funded Next',
  subscriptionPlan: 'Pro',
  lastSync: '2026-02-10 14:22',
  activeUsers: 1,
  subscriptionStatus: 'active' as const,
  lastActivity: '2026-03-04T14:30:00Z',
};

export const mockVPSData = {
  provider: 'Contabo',
  ipAddress: '185.123.456.789',
  operatingSystem: 'Windows Server 2022',
  status: 'Connected',
};

export const mockBrokerData = {
  name: 'Vantage',
  mt5Account: '24031010',
  mt5Server: 'VantageInternational-Live 14',
  status: 'Connected',
};

export const mockPropFirmData = {
  name: 'Funded Next',
  accountNumber: '87654321',
  server: 'FundedNext-Live',
  phase: 'Challenge',
  status: 'Active',
};

export const mockSubscriptionData = {
  plan: 'Pro',
  price: '$99/month',
  status: 'Active',
  nextBillingDate: '2026-03-10',
  paymentMethod: 'Visa **** 4242',
};

export const mockAdminStats = {
  totalUsers: 5432,
  activeUsers: 4821,
  newUsersThisMonth: 456,
  suspendedUsers: 89,
  totalSubscriptions: 4821,
  activeSubscriptions: 4621,
  totalRevenue: '$485,420',
  monthlyRevenue: '$45,230',
  vpsConnected: 3214,
  brokersConnected: 4821,
  propFirmsConnected: 3456,
  signupGrowth: [
    { month: 'Jan', value: 320 },
    { month: 'Feb', value: 380 },
    { month: 'Mar', value: 456 },
  ],
};

export const mockSubscriptions = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'John Carter',
    userEmail: 'john@email.com',
    plan: 'Pro',
    price: '$99/month',
    status: 'active' as const,
    startDate: '2026-01-15',
    nextBillingDate: '2026-04-15',
    paymentMethod: 'Visa **** 4242',
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'Jane Smith',
    userEmail: 'jane@email.com',
    plan: 'Enterprise',
    price: '$299/month',
    status: 'active' as const,
    startDate: '2026-02-10',
    nextBillingDate: '2026-04-10',
    paymentMethod: 'Mastercard **** 8765',
  },
  {
    id: '3',
    userId: 'user-3',
    userName: 'Bob Johnson',
    userEmail: 'bob@email.com',
    plan: 'Basic',
    price: '$29/month',
    status: 'cancelled' as const,
    startDate: '2025-12-01',
    nextBillingDate: '2026-03-01',
    paymentMethod: 'Visa **** 1234',
  },
];

export const mockVPSAccounts = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'John Carter',
    provider: 'Contabo',
    ipAddress: '185.123.456.789',
    operatingSystem: 'Windows Server 2022',
    status: 'connected' as const,
    connectedDate: '2026-02-07',
    lastSync: '2026-03-04T14:22:00Z',
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'Jane Smith',
    provider: 'Linode',
    ipAddress: '192.168.1.100',
    operatingSystem: 'Ubuntu 20.04',
    status: 'connected' as const,
    connectedDate: '2026-02-10',
    lastSync: '2026-03-04T15:10:00Z',
  },
  {
    id: '3',
    userId: 'user-3',
    userName: 'Bob Johnson',
    provider: 'DigitalOcean',
    ipAddress: '172.16.0.50',
    operatingSystem: 'Windows Server 2019',
    status: 'disconnected' as const,
    connectedDate: '2026-01-20',
    lastSync: '2026-02-15T09:30:00Z',
  },
];

export const mockBrokerAccounts = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'John Carter',
    brokerName: 'Vantage',
    mt5Account: '24031010',
    mt5Server: 'VantageInternational-Live 14',
    status: 'active' as const,
    balance: '$45,230',
    connectedDate: '2026-02-07',
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'Jane Smith',
    brokerName: 'Exness',
    mt5Account: '45620831',
    mt5Server: 'ExnessReal-1 98',
    status: 'active' as const,
    balance: '$123,456',
    connectedDate: '2026-02-10',
  },
  {
    id: '3',
    userId: 'user-4',
    userName: 'Alice Williams',
    brokerName: 'FxPro',
    mt5Account: '12345678',
    mt5Server: 'FxPro-Live 5',
    status: 'inactive' as const,
    balance: '$0',
    connectedDate: '2026-01-15',
  },
];

export const mockPropFirmAccounts = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'John Carter',
    propFirmName: 'Funded Next',
    accountNumber: '87654321',
    mt5Server: 'FundedNext-Live',
    phase: 'Challenge',
    status: 'active' as const,
    accountSize: '$100,000',
    currentDrawdown: '5.2%',
    connectedDate: '2026-02-07',
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'Jane Smith',
    propFirmName: 'FTMO',
    accountNumber: '98765432',
    mt5Server: 'FTMO-Live',
    phase: 'Verification',
    status: 'active' as const,
    accountSize: '$25,000',
    currentDrawdown: '3.1%',
    connectedDate: '2026-02-10',
  },
  {
    id: '3',
    userId: 'user-5',
    userName: 'Charlie Brown',
    propFirmName: 'MyForexFunds',
    accountNumber: '55555555',
    mt5Server: 'MyForexFunds-Live',
    phase: 'Complete',
    status: 'funded' as const,
    accountSize: '$50,000',
    currentDrawdown: '2.5%',
    connectedDate: '2026-01-20',
  },
];

export const mockRecentActivity = [
  {
    id: '1',
    user: 'You',
    action: 'VPS connected successfully',
    timestamp: '2026-02-10T12:00:00Z',
  },
  {
    id: '2',
    user: 'You',
    action: 'Broker account synced',
    timestamp: '2026-02-09T10:30:00Z',
  },
  {
    id: '3',
    user: 'You',
    action: 'API key generated',
    timestamp: '2026-02-08T14:22:00Z',
  },
];

export const mockOnboardingData = {
  vps: {
    provider: 'Contabo',
    ipAddress: '185.123.456.789',
    vpsUsername: 'admin',
    vpsPassword: '••••••••',
    loginUrl: 'https://api.contabo.com',
    panelUsername: 'admin@contabo.com',
    panelPassword: '••••••••',
    operatingSystem: 'Windows Server 2022',
  },
  broker: {
    brokerName: 'Vantage',
    mt5AccountNumber: '24031010',
    mt5Password: '••••••••',
    mt5Server: 'VantageInternational-Live 14',
    brokerPassword: '••••••••',
  },
  propFirm: {
    propFirmName: 'Funded Next',
    mt5AccountNumber: '87654321',
    mt5Password: '••••••••',
    mt5Server: 'FundedNext-Live',
    phase: 'Challenge',
  },
  generatedApiKey: {
    apiKey: 'dave_live_a8KxR7mN2pQ9',
    prefix: 'dave_live_a8Kx',
    environment: 'Live',
  },
};
