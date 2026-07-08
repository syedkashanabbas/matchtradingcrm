'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';

interface BrokerData {
  brokerName: string;
  mt5AccountNumber: string;
  mt5Password: string;
  mt5Server: string;
  brokerPortalPassword?: string;
}

export default function OnboardingBrokerPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<BrokerData>({
    brokerName: '',
    mt5AccountNumber: '',
    mt5Password: '',
    mt5Server: '',
    brokerPortalPassword: ''
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

  const handleInputChange = (field: keyof BrokerData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.createBroker(formData);
      router.push('/onboarding/prop');
    } catch (error) {
      console.error('Error saving broker data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/onboarding/vps');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Broker Configuration
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect your MT5 broker account for automated trading
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
              <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium">VPS</span>
            </div>
            <div className="h-1 w-16 bg-emerald-500" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="text-sm font-medium">Broker</span>
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
            <CardTitle>Broker Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="mt5Password">MT5 Password *</Label>
                  <Input
                    id="mt5Password"
                    type="password"
                    value={formData.mt5Password}
                    onChange={(e) => handleInputChange('mt5Password', e.target.value)}
                    className="mt-2"
                    required
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
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="brokerPortalPassword">Broker Portal Password (Optional)</Label>
                  <Input
                    id="brokerPortalPassword"
                    type="password"
                    value={formData.brokerPortalPassword || ''}
                    onChange={(e) => handleInputChange('brokerPortalPassword', e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Password for accessing your broker's web portal or client area
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.brokerName || !formData.mt5AccountNumber || !formData.mt5Password || !formData.mt5Server}
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
