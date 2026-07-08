'use client';

import { useState, useEffect } from 'react';
import { Search, Users, ChevronDown, ChevronRight, Mail, Calendar, UserCheck, Layers, X, Globe, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../../../lib/api';
import { ReferralLinkData, NetworkTreeData } from '../../../../src/types/network.types';

interface ClientNetwork {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  status: string;
  role: string;
  createdAt: string;
  totalTeamMembers: number;
  totalLevels: number;
  directReferrals: number;
  networkTree: any;
}

export default function AdminNetworkPage() {
  const [activeTab, setActiveTab] = useState('referral');
  const [copied, setCopied] = useState(false);
  const [clients, setClients] = useState<ClientNetwork[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [referralData, setReferralData] = useState<ReferralLinkData | null>(null);
  const [adminNetworkTree, setAdminNetworkTree] = useState<NetworkTreeData | null>(null);

  useEffect(() => {
    fetchAdminReferralLink();
    fetchAdminNetworkTree();
    fetchAllClientNetworks();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(client => {
      // First apply search filter
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.referralCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Then apply network tree filter - only show users with referral connections
      const hasNetworkConnection = 
        client.directReferrals > 0 || 
        (client.networkTree && client.networkTree.children && client.networkTree.children.length > 0) ||
        (client.networkTree && client.networkTree.hasParent === true);
      
      return matchesSearch && hasNetworkConnection;
    });
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const fetchAdminReferralLink = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMyReferralLink();
      const data = response.data || response;
      setReferralData(data as ReferralLinkData);
    } catch (error) {
      console.error('Failed to fetch admin referral link:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminNetworkTree = async () => {
    try {
      const response = await apiClient.getMyNetworkTree();
      const data = response.data || response;
      setAdminNetworkTree(data as NetworkTreeData);
    } catch (error) {
      console.error('Failed to fetch admin network tree:', error);
    }
  };

  const fetchAllClientNetworks = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin
      const storedUser = sessionStorage.getItem('auth-user');
      if (!storedUser) {
        console.error('No user found in sessionStorage');
        return;
      }
      
      const userData = JSON.parse(storedUser);
      console.log('Current user role:', userData.role);
      
      if (userData.role !== 'ADMIN') {
        console.error('User is not admin:', userData.role);
        alert('Access Denied: You need admin privileges to view this page. Please login with an admin account.');
        window.location.href = '/login';
        return;
      }
      
      const token = localStorage.getItem('accessToken') || userData.accessToken;
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/network/all-networks`;
      
      console.log('Debug - API URL:', apiUrl);
      console.log('Debug - Token:', token ? 'Token exists' : 'No token');
      console.log('Debug - Making API call...');
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Debug - Response status:', response.status);
      console.log('Debug - Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Debug - Error response:', errorText);
        
        // If 403 or 401, redirect to login
        if (response.status === 403 || response.status === 401) {
          console.log('Authentication failed, redirecting to login...');
          alert('Your session has expired. Please login again.');
          localStorage.removeItem('accessToken');
          sessionStorage.removeItem('auth-user');
          window.location.href = '/login';
          return;
        }
        
        throw new Error(`Failed to fetch client networks (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error('Failed to fetch client networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const handleCopyLink = () => {
    const referralLink = referralData?.referralLink || '';
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

  const TreeNode = ({ node, level = 0, clientId }: { node: any; level?: number; clientId?: string }) => {
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
        <div className="flex items-start">
          {level > 0 && (
            <div className="w-2 sm:w-8 h-0.5 bg-gray-300 mr-1 sm:mr-2 mt-3 sm:mt-4 flex-shrink-0"></div>
          )}
          
          <div className={`relative border-2 rounded-lg p-2 sm:p-3 cursor-pointer transition-all hover:shadow-md min-w-0 flex-1 ${getBorderColor(level)} ${
            level === 0 ? 'bg-purple-50 shadow-lg' : 'bg-white'
          }`}>
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="absolute -left-2 -top-2 bg-white border border-gray-300 rounded-full p-1 sm:p-1.5 hover:bg-gray-50 z-10 touch-manipulation"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full ${getAvatarColor(level)} flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0`}>
                {node.name ? node.name.charAt(0) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs sm:text-sm sm:text-base truncate">{node.name || 'Unknown'}</div>
                <div className="text-xs text-gray-500">Level {level}</div>
              </div>
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getStatusColor(node.status || 'Unknown')} flex-shrink-0`}></div>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-2 sm:ml-8 mt-1 sm:mt-2 relative">
            {node.children.map((child: any, index: number) => (
              <div key={child.id} className="relative">
                {index < node.children.length - 1 && (
                  <div className="absolute left-1 sm:left-4 top-0 w-0.5 h-full bg-gray-300"></div>
                )}
                <div className="py-1 sm:py-2">
                  <TreeNode node={child} level={level + 1} clientId={clientId} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'NEW':
        return 'bg-blue-100 text-blue-800';
      case 'ONBOARDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'CLIENT':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'referral', label: 'Referral Link', icon: Globe },
    { id: 'network', label: 'My Network', icon: Users },
  ];

  const referralLink = referralData?.referralLink || '';

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Network</h1>
          <p className="text-muted-foreground mt-2">Manage your referral network and track growth</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Network</h1>
        <p className="text-muted-foreground mt-2">Manage your referral network and track growth</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3 sm:px-1 border-b-2 font-medium text-sm transition-colors flex items-center justify-center sm:justify-start ${
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
          <div className="space-y-6">
            {/* Admin's Own Network Tree */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">My Network Tree</h2>
              <div className="overflow-x-auto">
                <div className="min-w-max p-2 sm:p-4">
                  {adminNetworkTree ? (
                    <TreeNode node={adminNetworkTree} />
                  ) : loading ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="text-muted-foreground text-sm sm:text-base">Loading network tree...</div>
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <div className="text-muted-foreground text-sm sm:text-base">No network data available</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar for Client Networks */}
            <div className="bg-card rounded-lg border border-border p-3 sm:p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or referral code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Client Networks */}
            {filteredClients.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Networks Found
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No clients match your search criteria.'
                    : 'No client networks available.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-card rounded-lg border border-border overflow-hidden"
                  >
                    {/* Client Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-cyan-50 p-4 sm:p-6 border-b border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                            {client.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                              {client.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center truncate">
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                              client.status
                            )}`}
                          >
                            {client.status}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(
                              client.role
                            )}`}
                          >
                            {client.role}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4">
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl font-bold text-primary">
                            {client.totalTeamMembers}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Total Members
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg sm:text-2xl font-bold text-primary">
                            {client.totalLevels}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Network Levels
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg sm:text-2xl font-bold text-primary">
                            {client.directReferrals}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Direct Referrals
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-center">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">{new Date(client.createdAt).toLocaleDateString()}</span>
                            <span className="sm:hidden">{new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Network Tree */}
                    <div className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <h4 className="text-base sm:text-lg font-semibold text-foreground flex items-center">
                          <Layers className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Network Tree
                        </h4>

                        <button
                          onClick={() => toggleClientExpansion(client.id)}
                          className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-muted/50 self-start sm:self-auto"
                        >
                          {expandedClients.has(client.id) ? (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              <span className="text-xs sm:text-sm">Collapse Tree</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4" />
                              <span className="text-xs sm:text-sm">Expand Tree</span>
                            </>
                          )}
                        </button>
                      </div>

                      {expandedClients.has(client.id) && (
                        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                          <div className="min-w-max p-2 sm:p-4 bg-muted/30 rounded-lg">
                            {client.networkTree ? (
                              <TreeNode
                                node={client.networkTree}
                                clientId={client.id}
                              />
                            ) : (
                              <div className="text-center py-6 sm:py-8">
                                <UserCheck className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                                <div className="text-muted-foreground text-sm sm:text-base">
                                  No network data available
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
