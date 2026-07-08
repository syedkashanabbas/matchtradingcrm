export type ReferralLinkData = {
  referralCode: string;
  referralLink: string;
  registrations: number;
  linkClicks: number;
};

export type TreeNode = {
  id: string;
  name: string;
  level: number;
  status: string;
  children: TreeNode[];
};

export type NetworkTreeData = TreeNode;

export type DirectReferral = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
};

export type NetworkStats = {
  directReferrals: number;
  totalNetwork: number;
  networkDepth: number;
  activeMembers: number;
  newThisMonth: number;
  newThisWeek: number;
  pendingActivation: number;
};

export type LeaderboardData = {
  topRecruitersMonth: { rank: number; name: string; referralCount: number }[];
  fastestGrowing: { rank: number; name: string; networkGrowthThisMonth: number }[];
};

export type ActivityEvent = {
  id: string;
  eventType: string;
  message: string;
  relatedUserName: string;
  createdAt: string;
};

export type OrphanUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  registrationSource: string;
  status: string;
};

export type AdminNetworkOverview = {
  totalUsers: number;
  referredUsers: number;
  organicUsers: number;
  avgNetworkDepth: number;
  topRecruitersAllTime: { rank: number; name: string; count: number }[];
  topRecruitersMonth: { rank: number; name: string; count: number }[];
};

export type AdminUserNetwork = {
  referredBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  referralCode: string;
  directReferralsCount: number;
  directReferrals: DirectReferral[];
  totalNetworkSize: number;
  networkDepth: number;
};
