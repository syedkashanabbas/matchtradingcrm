'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface BrokerAccount {
  id: string;
  brokerName: string;
  mt5AccountNumber: string;
  mt5Server: string;
  status: string;
  createdAt: string;
}

export default function BrokerSettingsPage() {
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBroker, setEditingBroker] = useState<BrokerAccount | null>(null);
  const [formData, setFormData] = useState({
    brokerName: '',
    mt5AccountNumber: '',
    mt5Password: '',
    mt5Server: '',
    brokerPortalPassword: ''
  });

  useEffect(() => {
    loadBrokerAccounts();
  }, []);

  const loadBrokerAccounts = async () => {
    try {
      const response = await apiClient.getBrokerList();
      setBrokerAccounts((response as any).data || []);
    } catch (error) {
      console.error('Error loading broker accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingBroker(null);
    setFormData({
      brokerName: '',
      mt5AccountNumber: '',
      mt5Password: '',
      mt5Server: '',
      brokerPortalPassword: ''
    });
    setIsEditing(true);
  };

  const handleEdit = (broker: BrokerAccount) => {
    setEditingBroker(broker);
    setFormData({
      brokerName: broker.brokerName,
      mt5AccountNumber: broker.mt5AccountNumber,
      mt5Password: '',
      mt5Server: broker.mt5Server,
      brokerPortalPassword: ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (editingBroker) {
        await apiClient.updateBroker(editingBroker.id, formData);
      } else {
        await apiClient.createBroker(formData);
      }
      await loadBrokerAccounts();
      setIsEditing(false);
      setEditingBroker(null);
    } catch (error) {
      console.error('Error saving broker account:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this broker account?')) {
      try {
        await apiClient.deleteBroker(id);
        await loadBrokerAccounts();
      } catch (error) {
        console.error('Error deleting broker account:', error);
      }
    }
  };

  const handleValidate = async (id: string) => {
    try {
      await apiClient.validateBroker(id);
      alert('Broker account validation successful!');
    } catch (error) {
      console.error('Broker validation failed:', error);
      alert('Broker account validation failed. Please check your credentials.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingBroker(null);
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
            <Briefcase className="h-8 w-8" />
            Broker Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your MT5 broker account configurations
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Broker
        </Button>
      </div>

      {/* Broker List */}
      {!isEditing && (
        <div className="grid gap-4">
          {brokerAccounts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Broker Accounts</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't set up any broker accounts yet.
                  </p>
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Your First Broker
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            brokerAccounts.map((broker) => (
              <Card key={broker.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">{broker.brokerName}</h3>
                        <Badge variant={broker.status === 'active' ? 'default' : 'secondary'}>
                          {broker.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">MT5 Account Number</p>
                          <p className="font-mono text-foreground">{broker.mt5AccountNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">MT5 Server</p>
                          <p className="text-foreground">{broker.mt5Server}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="text-foreground">
                            {new Date(broker.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidate(broker.id)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" /> Validate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(broker)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(broker.id)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
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
              {editingBroker ? 'Edit Broker Account' : 'Add Broker Account'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="brokerName">Broker Name *</Label>
                  <Select value={formData.brokerName} onValueChange={(value) => handleInputChange('brokerName', value)}>
                    <SelectTrigger id="brokerName" className="mt-2">
                      <SelectValue placeholder="Select your broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vantage">Vantage</SelectItem>
                      <SelectItem value="Exness">Exness</SelectItem>
                      <SelectItem value="FxPro">FxPro</SelectItem>
                      <SelectItem value="IC Markets">IC Markets</SelectItem>
                      <SelectItem value="Pepperstone">Pepperstone</SelectItem>
                      <SelectItem value="Admiral Markets">Admiral Markets</SelectItem>
                      <SelectItem value="XM">XM</SelectItem>
                      <SelectItem value="OctaFX">OctaFX</SelectItem>
                      <SelectItem value="FXTM">FXTM</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mt5AccountNumber">MT5 Account Number *</Label>
                  <Input
                    id="mt5AccountNumber"
                    type="text"
                    placeholder="12345678"
                    value={formData.mt5AccountNumber}
                    onChange={(e) => handleInputChange('mt5AccountNumber', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="mt5Password">MT5 Password {editingBroker ? '(leave blank to keep current)' : '*'}</Label>
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
                    placeholder="VantageInternational-Live 14"
                    value={formData.mt5Server}
                    onChange={(e) => handleInputChange('mt5Server', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="brokerPortalPassword">Broker Portal Password (Optional)</Label>
                  <Input
                    id="brokerPortalPassword"
                    type="password"
                    value={formData.brokerPortalPassword}
                    onChange={(e) => handleInputChange('brokerPortalPassword', e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Password for accessing your broker's web portal or client area
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.brokerName || !formData.mt5AccountNumber || !formData.mt5Server}>
                  {editingBroker ? 'Update' : 'Create'} Broker
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
