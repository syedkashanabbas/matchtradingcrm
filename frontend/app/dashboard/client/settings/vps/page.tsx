'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Server, Plus, Edit, Trash2, TestTube } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface VPSConfig {
  id: string;
  provider: string;
  ipAddress: string;
  sshUsername: string;
  sshPassword?: string;
  panelUrl?: string;
  panelUsername?: string;
  panelPassword?: string;
  operatingSystem: string;
  status: string;
  createdAt: string;
}

export default function VPSSettingsPage() {
  const [vpsConfigs, setVpsConfigs] = useState<VPSConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVps, setEditingVps] = useState<VPSConfig | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    ipAddress: '',
    sshUsername: 'root',
    sshPassword: '',
    panelUrl: '',
    panelUsername: '',
    panelPassword: '',
    operatingSystem: 'Windows Server 2022'
  });

  useEffect(() => {
    loadVpsConfigs();
  }, []);

  const loadVpsConfigs = async () => {
    try {
      const response = await apiClient.getVpsList();
      setVpsConfigs((response as any).data || []);
    } catch (error) {
      console.error('Error loading VPS configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingVps(null);
    setFormData({
      provider: '',
      ipAddress: '',
      sshUsername: 'root',
      sshPassword: '',
      panelUrl: '',
      panelUsername: '',
      panelPassword: '',
      operatingSystem: 'Windows Server 2022'
    });
    setIsEditing(true);
  };

  const handleEdit = (vps: VPSConfig) => {
    setEditingVps(vps);
    setFormData({
      provider: vps.provider,
      ipAddress: vps.ipAddress,
      sshUsername: vps.sshUsername,
      sshPassword: '',
      panelUrl: vps.panelUrl || '',
      panelUsername: vps.panelUsername || '',
      panelPassword: '',
      operatingSystem: vps.operatingSystem
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (editingVps) {
        await apiClient.updateVps(editingVps.id, formData);
      } else {
        await apiClient.createVps(formData);
      }
      await loadVpsConfigs();
      setIsEditing(false);
      setEditingVps(null);
    } catch (error) {
      console.error('Error saving VPS config:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this VPS configuration?')) {
      try {
        await apiClient.deleteVps(id);
        await loadVpsConfigs();
      } catch (error) {
        console.error('Error deleting VPS config:', error);
      }
    }
  };

  const handleTest = async (id: string) => {
    try {
      await apiClient.testVps(id);
      alert('VPS connection test successful!');
    } catch (error) {
      console.error('VPS test failed:', error);
      alert('VPS connection test failed. Please check your configuration.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingVps(null);
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
            <Server className="h-8 w-8" />
            VPS Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your Virtual Private Server configurations
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add VPS
        </Button>
      </div>

      {/* VPS List */}
      {!isEditing && (
        <div className="grid gap-4">
          {vpsConfigs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No VPS Configurations</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't set up any VPS configurations yet.
                  </p>
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Your First VPS
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            vpsConfigs.map((vps) => (
              <Card key={vps.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">{vps.provider}</h3>
                        <Badge variant={vps.status === 'active' ? 'default' : 'secondary'}>
                          {vps.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">IP Address</p>
                          <p className="font-mono text-foreground">{vps.ipAddress}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">SSH Username</p>
                          <p className="text-foreground">{vps.sshUsername}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Operating System</p>
                          <p className="text-foreground">{vps.operatingSystem}</p>
                        </div>
                        {vps.panelUrl && (
                          <div>
                            <p className="text-muted-foreground">Panel URL</p>
                            <p className="text-foreground text-blue-600">{vps.panelUrl}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="text-foreground">
                            {new Date(vps.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(vps.id)}
                        className="gap-2"
                      >
                        <TestTube className="h-4 w-4" /> Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vps)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(vps.id)}
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
              {editingVps ? 'Edit VPS Configuration' : 'Add VPS Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="provider">VPS Provider *</Label>
                  <Select value={formData.provider} onValueChange={(value) => handleInputChange('provider', value)}>
                    <SelectTrigger id="provider" className="mt-2">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contabo">Contabo</SelectItem>
                      <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                      <SelectItem value="linode">Linode</SelectItem>
                      <SelectItem value="vultr">Vultr</SelectItem>
                      <SelectItem value="aws">AWS EC2</SelectItem>
                      <SelectItem value="azure">Azure</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ipAddress">IP Address *</Label>
                  <Input
                    id="ipAddress"
                    type="text"
                    placeholder="192.168.1.100"
                    value={formData.ipAddress}
                    onChange={(e) => handleInputChange('ipAddress', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="sshUsername">SSH Username *</Label>
                  <Input
                    id="sshUsername"
                    type="text"
                    value={formData.sshUsername}
                    onChange={(e) => handleInputChange('sshUsername', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="sshPassword">SSH Password {editingVps ? '(leave blank to keep current)' : '*'}</Label>
                  <Input
                    id="sshPassword"
                    type="password"
                    value={formData.sshPassword}
                    onChange={(e) => handleInputChange('sshPassword', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="panelUrl">Panel URL (Optional)</Label>
                  <Input
                    id="panelUrl"
                    type="url"
                    placeholder="https://panel.provider.com"
                    value={formData.panelUrl}
                    onChange={(e) => handleInputChange('panelUrl', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="panelUsername">Panel Username (Optional)</Label>
                  <Input
                    id="panelUsername"
                    type="text"
                    value={formData.panelUsername}
                    onChange={(e) => handleInputChange('panelUsername', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="panelPassword">Panel Password (Optional)</Label>
                  <Input
                    id="panelPassword"
                    type="password"
                    value={formData.panelPassword}
                    onChange={(e) => handleInputChange('panelPassword', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="operatingSystem">Operating System *</Label>
                  <Select value={formData.operatingSystem} onValueChange={(value) => handleInputChange('operatingSystem', value)}>
                    <SelectTrigger id="operatingSystem" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows Server 2022">Windows Server 2022</SelectItem>
                      <SelectItem value="Windows Server 2019">Windows Server 2019</SelectItem>
                      <SelectItem value="Ubuntu 20.04">Ubuntu 20.04 LTS</SelectItem>
                      <SelectItem value="Ubuntu 22.04">Ubuntu 22.04 LTS</SelectItem>
                      <SelectItem value="CentOS 7">CentOS 7</SelectItem>
                      <SelectItem value="CentOS 8">CentOS 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.provider || !formData.ipAddress}>
                  {editingVps ? 'Update' : 'Create'} VPS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
