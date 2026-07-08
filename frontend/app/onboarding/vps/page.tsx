'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Server, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';

interface VPSData {
  provider: string;
  ipAddress: string;
  sshUsername: string;
  sshPassword: string;
  panelUrl?: string;
  panelUsername?: string;
  panelPassword?: string;
  operatingSystem: string;
}

export default function OnboardingVPSPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<VPSData>({
    provider: '',
    ipAddress: '',
    sshUsername: 'root',
    sshPassword: '',
    operatingSystem: 'Windows Server 2022'
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user is admin - admins should not access onboarding
    if (user?.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }
  }, [isAuthenticated, user, router]);

  const handleInputChange = (field: keyof VPSData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.createVps(formData);
      router.push('/onboarding/broker');
    } catch (error) {
      console.error('Error saving VPS data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Server className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            VPS Configuration
          </h1>
          <p className="text-xl text-muted-foreground">
            Set up your Virtual Private Server for automated trading
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium">Payment</span>
            </div>
            <div className="h-1 w-16 bg-emerald-500" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="text-sm font-medium">VPS</span>
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="text-sm text-muted-foreground">Broker</span>
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <span className="text-sm text-muted-foreground">Prop Firm</span>
            </div>
            <div className="h-1 w-16 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                5
              </div>
              <span className="text-sm text-muted-foreground">Review</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>VPS Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    required
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
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sshPassword">SSH Password *</Label>
                  <Input
                    id="sshPassword"
                    type="password"
                    value={formData.sshPassword}
                    onChange={(e) => handleInputChange('sshPassword', e.target.value)}
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="panelUrl">Panel URL (Optional)</Label>
                  <Input
                    id="panelUrl"
                    type="url"
                    placeholder="https://panel.provider.com"
                    value={formData.panelUrl || ''}
                    onChange={(e) => handleInputChange('panelUrl', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="panelUsername">Panel Username (Optional)</Label>
                  <Input
                    id="panelUsername"
                    type="text"
                    value={formData.panelUsername || ''}
                    onChange={(e) => handleInputChange('panelUsername', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="panelPassword">Panel Password (Optional)</Label>
                  <Input
                    id="panelPassword"
                    type="password"
                    value={formData.panelPassword || ''}
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

              {/* Navigation */}
              <div className="flex justify-end pt-6 border-t border-border">
                <Button
                  type="submit"
                  disabled={isLoading || !formData.provider || !formData.ipAddress || !formData.sshPassword}
                  className="gap-2"
                >
                  {isLoading ? 'Saving...' : 'Next'} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
