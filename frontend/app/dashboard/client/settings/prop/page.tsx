'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building, Plus, Edit, Trash2, CheckCircle, Trophy } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface PropAccount {
  id: string;
  firmName: string;
  mt5AccountNumber: string;
  mt5Server: string;
  phase: 'CHALLENGE' | 'FUNDED';
  isActive: boolean;
  createdAt: string;
}

export default function PropSettingsPage() {
  const [propAccounts, setPropAccounts] = useState<PropAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProp, setEditingProp] = useState<PropAccount | null>(null);
  const [formData, setFormData] = useState({
    firmName: '',
    mt5AccountNumber: '',
    mt5Password: '',
    mt5Server: '',
    phase: 'CHALLENGE' as 'CHALLENGE' | 'FUNDED'
  });

  useEffect(() => {
    loadPropAccounts();
  }, []);

  const loadPropAccounts = async () => {
    try {
      const response = await apiClient.getPropList();
      setPropAccounts((response as any).data || []);
    } catch (error) {
      console.error('Error loading prop accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProp(null);
    setFormData({
      firmName: '',
      mt5AccountNumber: '',
      mt5Password: '',
      mt5Server: '',
      phase: 'CHALLENGE'
    });
    setIsEditing(true);
  };

  const handleEdit = (prop: PropAccount) => {
    setEditingProp(prop);
    setFormData({
      firmName: prop.firmName,
      mt5AccountNumber: prop.mt5AccountNumber,
      mt5Password: '',
      mt5Server: prop.mt5Server,
      phase: prop.phase
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (editingProp) {
        await apiClient.updateProp(editingProp.id, formData);
      } else {
        await apiClient.createProp(formData);
      }
      await loadPropAccounts();
      setIsEditing(false);
      setEditingProp(null);
    } catch (error) {
      console.error('Error saving prop account:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this prop firm account?')) {
      try {
        await apiClient.archiveProp(id);
        await loadPropAccounts();
      } catch (error) {
        console.error('Error deleting prop account:', error);
      }
    }
  };

  const handleValidate = async (id: string) => {
    try {
      await apiClient.validateProp(id);
      alert('Prop firm account validation successful!');
    } catch (error) {
      console.error('Prop validation failed:', error);
      alert('Prop firm account validation failed. Please check your credentials.');
    }
  };

  const handlePhaseUpdate = async (id: string, phase: 'CHALLENGE' | 'FUNDED') => {
    try {
      await apiClient.updatePropPhase(id, phase);
      await loadPropAccounts();
    } catch (error) {
      console.error('Error updating prop phase:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingProp(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building className="h-8 w-8" />
            Prop Firm Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your prop firm account configurations
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Prop Firm
        </Button>
      </div>

      {/* Prop Firm List */}
      {!isEditing && (
        <div className="grid gap-4">
          {propAccounts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Prop Firm Accounts</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't set up any prop firm accounts yet.
                  </p>
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Your First Prop Firm
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            propAccounts.map((prop) => (
              <Card key={prop.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">{prop.firmName}</h3>
                        <Badge variant={prop.isActive ? 'default' : 'secondary'}>
                          {prop.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={prop.phase === 'FUNDED' ? 'default' : 'secondary'} className="gap-1">
                          <Trophy className="h-3 w-3" />
                          {prop.phase}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">MT5 Account Number</p>
                          <p className="font-mono text-foreground">{prop.mt5AccountNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">MT5 Server</p>
                          <p className="text-foreground">{prop.mt5Server}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="text-foreground">
                            {new Date(prop.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidate(prop.id)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" /> Validate
                      </Button>
                      <Select
                        value={prop.phase}
                        onValueChange={(value: 'CHALLENGE' | 'FUNDED') => handlePhaseUpdate(prop.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHALLENGE">Challenge</SelectItem>
                          <SelectItem value="FUNDED">Funded</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(prop)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(prop.id)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Archive
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit/Create Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProp ? 'Edit Prop Firm Account' : 'Add Prop Firm Account'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="firmName">Prop Firm Name *</Label>
                  <Select value={formData.firmName} onValueChange={(value) => handleInputChange('firmName', value)}>
                    <SelectTrigger id="firmName" className="mt-2">
                      <SelectValue placeholder="Select your prop firm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Funded Next">Funded Next</SelectItem>
                      <SelectItem value="FTMO">FTMO</SelectItem>
                      <SelectItem value="MyForexFunds">MyForexFunds</SelectItem>
                      <SelectItem value="TopTier">TopTier Trader</SelectItem>
                      <SelectItem value="Funded Trading Plus">Funded Trading Plus</SelectItem>
                      <SelectItem value="True Forex Funds">True Forex Funds</SelectItem>
                      <SelectItem value="FunderPro">FunderPro</SelectItem>
                      <SelectItem value="FunderZone">FunderZone</SelectItem>
                      <SelectItem value="The5ers">The5ers</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mt5AccountNumber">MT5 Account Number *</Label>
                  <Input
                    id="mt5AccountNumber"
                    type="text"
                    placeholder="87654321"
                    value={formData.mt5AccountNumber}
                    onChange={(e) => handleInputChange('mt5AccountNumber', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="mt5Password">MT5 Password {editingProp ? '(leave blank to keep current)' : '*'}</Label>
                  <Input
                    id="mt5Password"
                    type="password"
                    value={formData.mt5Password}
                    onChange={(e) => handleInputChange('mt5Password', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="mt5Server">MT5 Server *</Label>
                  <Input
                    id="mt5Server"
                    type="text"
                    placeholder="FundedNext-Live"
                    value={formData.mt5Server}
                    onChange={(e) => handleInputChange('mt5Server', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phase">Account Phase *</Label>
                  <Select value={formData.phase} onValueChange={(value: 'CHALLENGE' | 'FUNDED') => handleInputChange('phase', value)}>
                    <SelectTrigger id="phase" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHALLENGE">Challenge</SelectItem>
                      <SelectItem value="FUNDED">Funded</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select whether this is a challenge account or a funded account
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.firmName || !formData.mt5AccountNumber || !formData.mt5Server}>
                  {editingProp ? 'Update' : 'Create'} Prop Firm
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
