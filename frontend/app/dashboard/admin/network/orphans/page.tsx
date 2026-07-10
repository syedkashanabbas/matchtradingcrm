'use client';

import { useState } from 'react';
import { Users, Search, X, UserPlus } from 'lucide-react';

export default function OrphanUsersPage() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Mock data
  const orphanUsers = [
    { name: 'John D.', email: 'john@email.com', registered: 'Mar 1, 2026', source: 'Organic' },
    { name: 'Maria L.', email: 'maria@email.com', registered: 'Mar 5, 2026', source: 'Organic' },
    { name: 'Reza K.', email: 'reza@email.com', registered: 'Mar 10, 2026', source: 'Organic' }
  ];

  const potentialUplines = [
    { name: 'Marco S.', email: 'marco@email.com' },
    { name: 'Luigi V.', email: 'luigi@email.com' },
    { name: 'Sara M.', email: 'sara@email.com' },
    { name: 'Ahmed K.', email: 'ahmed@email.com' },
    { name: 'Paolo R.', email: 'paolo@email.com' }
  ];

  const filteredUplines = potentialUplines.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignUpline = (user: any) => {
    setSelectedUser(user);
    setShowAssignModal(true);
  };

  const handleConfirmAssignment = () => {
    setShowAssignModal(false);
    setSelectedUser(null);
    setSearchQuery('');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Orphan Users</h1>
        <p className="page-subtitle">
          These users registered without a referral link. Assign them to an upline manually.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Orphans</p>
              <p className="text-2xl font-bold text-foreground">{orphanUsers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-foreground">2</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Assignment</p>
              <p className="text-2xl font-bold text-foreground">{orphanUsers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-foreground">Orphan Users List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-6 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-6 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-6 font-medium text-muted-foreground">Registered</th>
                <th className="text-left py-3 px-6 font-medium text-muted-foreground">Source</th>
                <th className="text-left py-3 px-6 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {orphanUsers.map((user, index) => (
                <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-6 font-medium">{user.name}</td>
                  <td className="py-3 px-6">{user.email}</td>
                  <td className="py-3 px-6">{user.registered}</td>
                  <td className="py-3 px-6">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {user.source}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => handleAssignUpline(user)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      Assign Upline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Upline Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Assign Upline for {selectedUser.name}
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Search user by name or email...
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type to search..."
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {filteredUplines.map((upline, index) => (
                      <div
                        key={index}
                        className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="font-medium">{upline.name}</div>
                        <div className="text-sm text-muted-foreground">{upline.email}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleConfirmAssignment}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Confirm Assignment
                  </button>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Upline assigned successfully
        </div>
      )}
    </div>
  );
}
