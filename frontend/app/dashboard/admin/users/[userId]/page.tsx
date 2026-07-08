'use client';

import { useState } from 'react';
import { Copy, Users, ChevronDown, ChevronUp, Eye, X } from 'lucide-react';

export default function UserDetailPage() {
  const [expandedReferrals, setExpandedReferrals] = useState(false);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mock user data
  const user = {
    name: 'Marco S.',
    email: 'marco@email.com',
    referredBy: { name: 'Marco S.', email: 'marco@email.com' },
    referralCode: 'ABC123',
    directReferrals: 12,
    totalNetworkSize: 47,
    networkDepth: 5
  };

  // Mock direct referrals
  const directReferrals = [
    { name: 'Sara M.', email: 'sara@email.com', dateJoined: 'Jan 15, 2026' },
    { name: 'Luigi V.', email: 'luigi@email.com', dateJoined: 'Feb 3, 2026' },
    { name: 'Ahmed K.', email: 'ahmed@email.com', dateJoined: 'Feb 20, 2026' }
  ];

  // Mock tree data
  const treeData = {
    id: 'root',
    name: 'Marco S.',
    level: 0,
    children: [
      {
        id: 'sara',
        name: 'Sara',
        level: 1,
        children: [
          {
            id: 'giulia',
            name: 'Giulia',
            level: 2,
            children: []
          }
        ]
      },
      {
        id: 'luca',
        name: 'Luca',
        level: 1,
        children: []
      }
    ]
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TreeNode = ({ node, level = 0 }: { node: any; level?: number }) => {
    const getAvatarColor = (nodeLevel: number) => {
      switch (nodeLevel) {
        case 0: return 'bg-purple-500';
        case 1: return 'bg-cyan-500';
        case 2: return 'bg-green-500';
        default: return 'bg-gray-500';
      }
    };

    return (
      <div className="relative">
        <div className="flex items-center">
          {level > 0 && (
            <div className="w-8 h-0.5 bg-gray-300 mr-2"></div>
          )}
          
          <div className={`relative border-2 rounded-lg p-3 ${
            level === 0 ? 'border-purple-500 bg-purple-50 shadow-lg' : 'border-gray-300 bg-white'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(level)} flex items-center justify-center text-white font-semibold`}>
                {node.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium">{node.name}</div>
                <div className="text-xs text-gray-500">Level {level}</div>
              </div>
            </div>
          </div>
        </div>
        
        {node.children && node.children.length > 0 && (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Details</h1>
        <p className="text-muted-foreground mt-2">View and manage user information</p>
      </div>

      {/* User Basic Info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Network Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Network Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Referred By</p>
              <a href="#" className="text-primary hover:underline font-medium">
                {user.referredBy.name} ({user.referredBy.email})
              </a>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Referral Code</p>
              <div className="flex items-center space-x-2">
                <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                  {user.referralCode}
                </code>
                <button
                  onClick={handleCopyReferralCode}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copied && <span className="text-sm text-green-600">Copied!</span>}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Direct Referrals</p>
              <p className="font-medium">{user.directReferrals}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Total Network Size</p>
              <p className="font-medium">{user.totalNetworkSize}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Network Depth</p>
              <p className="font-medium">{user.networkDepth} levels</p>
            </div>
          </div>
        </div>

        {/* Direct Referrals List */}
        <div className="mt-6 border-t border-border pt-6">
          <button
            onClick={() => setExpandedReferrals(!expandedReferrals)}
            className="flex items-center space-x-2 text-primary hover:underline font-medium"
          >
            <span>Direct Referrals List ({directReferrals.length})</span>
            {expandedReferrals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {expandedReferrals && (
            <div className="mt-4 space-y-2">
              {directReferrals.map((referral, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{referral.name}</div>
                  <div className="text-sm text-muted-foreground">{referral.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">Joined: {referral.dateJoined}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Full Tree Button */}
        <div className="mt-6">
          <button
            onClick={() => setShowTreeModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>View Full Tree</span>
          </button>
        </div>
      </div>

      {/* Tree Modal */}
      {showTreeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Network Tree</h3>
                <button
                  onClick={() => setShowTreeModal(false)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="overflow-x-auto">
                <div className="min-w-max p-4">
                  <TreeNode node={treeData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
