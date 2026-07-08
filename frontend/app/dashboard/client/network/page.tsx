'use client';

import { useState, useEffect } from 'react';
import { Copy, Globe, Users, TrendingUp, Award, Activity, ChevronDown, ChevronRight, Medal, Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../../../lib/api';
import { ReferralLinkData, NetworkTreeData } from '../../../../src/types/network.types';

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState('referral');
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [referralData, setReferralData] = useState<ReferralLinkData | null>(null);
  const [networkTree, setNetworkTree] = useState<NetworkTreeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralLink();
    fetchNetworkTree();
  }, []);

  const fetchReferralLink = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMyReferralLink();
      // Handle both direct response and wrapped response
      const data = response.data || response;
      setReferralData(data as ReferralLinkData);
    } catch (error) {
      console.error('Failed to fetch referral link:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkTree = async () => {
    try {
      const response = await apiClient.getMyNetworkTree();
      // Handle both direct response and wrapped response
      const data = response.data || response;
      setNetworkTree(data as NetworkTreeData);
    } catch (error) {
      console.error('Failed to fetch network tree:', error);
    }
  };

  const referralLink = referralData?.referralLink || '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Mock data for tables
  const directReferrals = [
    { name: 'Marco S.', email: 'marco@email.com', dateJoined: 'Jan 15, 2026', status: 'Active' },
    { name: 'Luigi V.', email: 'luigi@email.com', dateJoined: 'Feb 3, 2026', status: 'Active' },
    { name: 'Ahmed K.', email: 'ahmed@email.com', dateJoined: 'Feb 20, 2026', status: 'Pending' }
  ];

  const topRecruiters = [
    { name: 'Marco S.', referrals: 23, rank: 1 },
    { name: 'Luigi V.', referrals: 18, rank: 2 },
    { name: 'Sara M.', referrals: 14, rank: 3 },
    { name: 'Ahmed K.', referrals: 11, rank: 4 },
    { name: 'Paolo R.', referrals: 9, rank: 5 }
  ];

  const fastestGrowing = [
    { name: 'Marco S.', growth: 41, rank: 1 },
    { name: 'Giulia F.', growth: 29, rank: 2 },
    { name: 'Luca D.', growth: 22, rank: 3 },
    { name: 'Sara M.', growth: 17, rank: 4 },
    { name: 'Ahmed K.', growth: 12, rank: 5 }
  ];

  const recentActivity = [
    { icon: '🟢', text: 'Sara joined your network (invited by Marco)', time: '2 hours ago' },
    { icon: '🟢', text: 'Giulia completed onboarding ✅', time: '1 day ago' },
    { icon: '🔵', text: 'Paolo\'s prop firm is PENDING admin approval', time: '3 days ago' },
    { icon: '🟡', text: 'Ahmed needs to complete VPS setup', time: '5 days ago' },
    { icon: '🟢', text: '🎉 Milestone! Your network reached 25 members', time: '1 week ago' }
  ];

  const TreeNode = ({ node, level = 0 }: { node: any; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    const getAvatarColor = (nodeLevel: number) => {
      switch (nodeLevel) {
        case 0: return 'bg-purple-500';
        case 1: return 'bg-cyan-500';
        case 2: return 'bg-green-500';
        case 3: return 'bg-amber-500';
        default: return 'bg-gray-500';
      }
    };

    const getStatusColor = (status: string) => {
      return status === 'Active' ? 'bg-green-500' : 'bg-yellow-500';
    };

    const getBorderColor = (nodeLevel: number) => {
      switch (nodeLevel) {
        case 0: return 'border-purple-500 shadow-purple-200';
        default: return 'border-gray-300';
      }
    };

    return (
      <div className="relative">
        <div className="flex items-center">
          {level > 0 && (
            <div className="w-8 h-0.5 bg-gray-300 mr-2"></div>
          )}
          
          <div className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${getBorderColor(level)} ${
            level === 0 ? 'bg-purple-50 shadow-lg' : 'bg-white'
          }`}>
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="absolute -left-2 -top-2 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-50"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(level)} flex items-center justify-center text-white font-semibold`}>
                {node.name ? node.name.charAt(0) : '?'}
              </div>
              <div>
                <div className="font-medium">{node.name || 'Unknown'}</div>
                <div className="text-xs text-gray-500">Level {level}</div>
              </div>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(node.status || 'Unknown')}`}></div>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-8 mt-2 relative">
            {node.children.map((child: any, index: number) => (
              <div key={child.id} className="relative">
                {index < node.children.length - 1 && (
                  <div className="absolute left-4 top-0 w-0.5 h-full bg-gray-300"></div>
                )}
                <div className="py-2">
                  <TreeNode node={child} level={level + 1} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'referral', label: 'My Referral Link', icon: Globe },
    { id: 'network', label: 'My Network', icon: Users },
    // { id: 'referrals', label: 'Direct Referrals', icon: TrendingUp },
    // { id: 'stats', label: 'Network Stats', icon: Award }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Network</h1>
        <p className="text-muted-foreground mt-2">Manage your referral network and track growth</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="inline-block w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'referral' && (
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">Your Referral Link</h2>
              <div className="bg-muted rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading referral link...</div>
                  ) : (
                    <div className="flex-1">
                      <code className="text-sm font-mono text-foreground break-all">{referralLink}</code>
                      {referralData && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Referral Code: {referralData.referralCode} | 
                          Registrations: {referralData.registrations}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleCopyLink}
                    disabled={loading || !referralLink}
                    className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-lg border border-border">
                  {loading ? (
                    <div className="w-[200px] h-[200px] bg-muted animate-pulse rounded" />
                  ) : (
                    <QRCodeSVG value={referralLink} size={200} />
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{referralData?.linkClicks || 0}</div>
                  <div className="text-sm text-muted-foreground">Link Clicks</div>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{referralData?.registrations || 0}</div>
                  <div className="text-sm text-muted-foreground">Registrations</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-4">My Network Tree</h2>
            <div className="overflow-x-auto">
              <div className="min-w-max p-4">
                {networkTree ? (
                  <TreeNode node={networkTree} />
                ) : loading ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">Loading network tree...</div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">No network data available</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Direct Referrals</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Date Joined</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {directReferrals.map((referral, index) => (
                    <tr key={index} className="border-b border-border">
                      <td className="py-3 px-6">{referral.name}</td>
                      <td className="py-3 px-6">{referral.email}</td>
                      <td className="py-3 px-6">{referral.dateJoined}</td>
                      <td className="py-3 px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          referral.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : referral.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {referral.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Primary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                <div className="text-3xl font-bold">12</div>
                <div className="text-sm opacity-90">Direct Referrals</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                <div className="text-3xl font-bold">47</div>
                <div className="text-sm opacity-90">Total Network</div>
              </div>
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-lg p-6 shadow-lg">
                <div className="text-3xl font-bold">5</div>
                <div className="text-sm opacity-90">Network Depth</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
                <div className="text-3xl font-bold">38</div>
                <div className="text-sm opacity-90">Active Members</div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">+8</div>
                <div className="text-sm text-muted-foreground">New This Month</div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">+3</div>
                <div className="text-sm text-muted-foreground">New This Week</div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">5</div>
                <div className="text-sm text-muted-foreground">Pending Activation</div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">+15%</div>
                <div className="text-sm text-muted-foreground">Growth Rate</div>
              </div>
            </div>

            {/* Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  🏆 Top Recruiters This Month
                </h3>
                <div className="space-y-3">
                  {topRecruiters.map((recruiter) => (
                    <div key={recruiter.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm">
                          {recruiter.rank === 1 && '🥇'}
                          {recruiter.rank === 2 && '🥈'}
                          {recruiter.rank === 3 && '🥉'}
                          {recruiter.rank > 3 && recruiter.rank}
                        </div>
                        <span>{recruiter.name}</span>
                      </div>
                      <span className="text-muted-foreground">{recruiter.referrals} referrals</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  🚀 Fastest Growing Networks
                </h3>
                <div className="space-y-3">
                  {fastestGrowing.map((network) => (
                    <div key={network.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm">
                          {network.rank === 1 && '🥇'}
                          {network.rank === 2 && '🥈'}
                          {network.rank === 3 && '🥉'}
                          {network.rank > 3 && network.rank}
                        </div>
                        <span>{network.name}</span>
                      </div>
                      <span className="text-muted-foreground">+{network.growth} members</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                ⚡ Recent Network Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 pb-3 border-b border-border last:border-0">
                    <span className="text-lg">{activity.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm">{activity.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
