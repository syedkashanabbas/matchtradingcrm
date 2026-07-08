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

export default function ClientOnboardingVPSPage() {
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
    
    // Client-side validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(formData.ipAddress)) {
      alert('Please enter a valid IP address (e.g., 192.168.1.100)');
      return;
    }
    
    setIsLoading(true);

    try {
      await apiClient.createVps(formData);
      sessionStorage.setItem('fromVPS', 'true');
      router.push('/dashboard/client/onboarding/broker');
    } catch (error) {
      console.error('Error saving VPS data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    sessionStorage.setItem('fromVPS', 'true');
    router.push('/dashboard/client/onboarding/broker');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Server className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
          </div>
          VPS Configuration
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Set up your Virtual Private Server for automated trading
        </p>
      </div>

      {/* Progress */}
      <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 min-w-max px-2 sm:px-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                1
              </div>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">VPS</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-primary flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                2
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Broker</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                3
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Prop Firm</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                4
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Payment</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                5
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">VPS Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 sm:pt-0">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="provider">VPS Provider</Label>
                <Select value={formData.provider} onValueChange={(value) => handleInputChange('provider', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aws">Amazon Web Services</SelectItem>
                    <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                    <SelectItem value="vultr">Vultr</SelectItem>
                    <SelectItem value="linode">Linode</SelectItem>
                    <SelectItem value="contabo">Contabo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  type="text"
                  placeholder="192.168.1.100"
                  value={formData.ipAddress}
                  onChange={(e) => handleInputChange('ipAddress', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sshUsername">SSH Username</Label>
                <Input
                  id="sshUsername"
                  type="text"
                  placeholder="root"
                  value={formData.sshUsername}
                  onChange={(e) => handleInputChange('sshUsername', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sshPassword">SSH Password</Label>
                <Input
                  id="sshPassword"
                  type="password"
                  placeholder="Enter SSH password"
                  value={formData.sshPassword}
                  onChange={(e) => handleInputChange('sshPassword', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panelUrl">Panel URL (Optional)</Label>
                <Input
                  id="panelUrl"
                  type="url"
                  placeholder="https://panel.example.com"
                  value={formData.panelUrl || ''}
                  onChange={(e) => handleInputChange('panelUrl', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panelUsername">Panel Username (Optional)</Label>
                <Input
                  id="panelUsername"
                  type="text"
                  placeholder="Panel username"
                  value={formData.panelUsername || ''}
                  onChange={(e) => handleInputChange('panelUsername', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panelPassword">Panel Password (Optional)</Label>
                <Input
                  id="panelPassword"
                  type="password"
                  placeholder="Panel password"
                  value={formData.panelPassword || ''}
                  onChange={(e) => handleInputChange('panelPassword', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operatingSystem">Operating System</Label>
                <Select value={formData.operatingSystem} onValueChange={(value) => handleInputChange('operatingSystem', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Windows Server 2022">Windows Server 2022</SelectItem>
                    <SelectItem value="Windows Server 2019">Windows Server 2019</SelectItem>
                    <SelectItem value="Ubuntu 22.04">Ubuntu 22.04</SelectItem>
                    <SelectItem value="Ubuntu 20.04">Ubuntu 20.04</SelectItem>
                    <SelectItem value="CentOS 8">CentOS 8</SelectItem>
                    <SelectItem value="Debian 11">Debian 11</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-4 sm:pt-6 border-t border-border">
              <Button
                type="submit"
                disabled={isLoading || !formData.provider || !formData.ipAddress || !formData.sshPassword}
                className="gap-2 text-sm sm:text-base px-4 sm:px-6 py-2"
              >
                {isLoading ? 'Saving...' : 'Next'} <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
