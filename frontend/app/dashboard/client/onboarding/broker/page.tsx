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
import { VigcoAlert } from '@/components/ui/vigco-alert';

interface BrokerData {
  brokerName: string;
  mt5AccountNumber: string;
  mt5Password: string;
  mt5Server: string;
  brokerPortalPassword?: string;
}

export default function ClientOnboardingBrokerPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showVigcoAlert, setShowVigcoAlert] = useState(false);
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

    if (user?.role === 'ADMIN') {
      router.push('/dashboard/admin');
      return;
    }

    // Check if user came from VPS form by checking the referrer
    const referrer = document.referrer;
    if (referrer.includes('/vps') || sessionStorage.getItem('fromVPS') === 'true') {
      setShowVigcoAlert(true);
      sessionStorage.removeItem('fromVPS');
    }
  }, [isAuthenticated, user, router]);

  const handleInputChange = (field: keyof BrokerData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.post('/v1/onboarding/broker', formData);
      sessionStorage.setItem('fromBroker', 'true');
      router.push('/dashboard/client/onboarding/prop');
    } catch (error) {
      console.error('Error saving broker data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/client/onboarding/vps');
  };

  const handleVigcoAlertClose = () => {
    setShowVigcoAlert(false);
  };

  const handleVigcoAlertContinue = () => {
    setShowVigcoAlert(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Briefcase className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
          </div>
          Broker Configuration
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Set up your MT5 broker account for automated trading
        </p>
      </div>

      {/* Progress */}
      <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 min-w-max px-2 sm:px-0">

            {/* Step 1 - VPS */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                1
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">VPS</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-primary flex-shrink-0" />

            {/* Step 2 - Broker */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                2
              </div>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Broker</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />

            {/* Step 3 - Prop Firm */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                3
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Prop Firm</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />

            {/* Step 4 - Payment */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
                4
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Payment</span>
            </div>

            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />

            {/* Step 5 - Review */}
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
          <CardTitle className="text-lg sm:text-xl">Broker Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 sm:pt-0">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

              <div className="space-y-2">
                <Label htmlFor="brokerName">Broker Name</Label>
                <Select value={formData.brokerName} onValueChange={(value) => handleInputChange('brokerName', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icmarkets">IC Markets</SelectItem>
                    <SelectItem value="pepperstone">Pepperstone</SelectItem>
                    <SelectItem value="fxpro">FXPro</SelectItem>
                    <SelectItem value="oanda">OANDA</SelectItem>
                    <SelectItem value="forexcom">FOREX.com</SelectItem>
                    <SelectItem value="adss">ADSS</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mt5AccountNumber">MT5 Account Number</Label>
                <Input
                  id="mt5AccountNumber"
                  type="text"
                  placeholder="123456789"
                  value={formData.mt5AccountNumber}
                  onChange={(e) => handleInputChange('mt5AccountNumber', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mt5Password">MT5 Password</Label>
                <Input
                  id="mt5Password"
                  type="password"
                  placeholder="Enter MT5 password"
                  value={formData.mt5Password}
                  onChange={(e) => handleInputChange('mt5Password', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mt5Server">MT5 Server</Label>
                <Input
                  id="mt5Server"
                  type="text"
                  placeholder="ICMarkets-Demo01"
                  value={formData.mt5Server}
                  onChange={(e) => handleInputChange('mt5Server', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brokerPortalPassword">Broker Portal Password (Optional)</Label>
                <Input
                  id="brokerPortalPassword"
                  type="password"
                  placeholder="Broker portal password"
                  value={formData.brokerPortalPassword || ''}
                  onChange={(e) => handleInputChange('brokerPortalPassword', e.target.value)}
                />
              </div>

            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 sm:pt-6 border-t border-border flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/client/onboarding/vps')}
                disabled={isLoading}
                className="gap-2 text-sm sm:text-base px-3 sm:px-4 py-2"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" /> Back
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !formData.brokerName ||
                  !formData.mt5AccountNumber ||
                  !formData.mt5Password ||
                  !formData.mt5Server
                }
                className="gap-2 text-sm sm:text-base px-3 sm:px-4 py-2"
              >
                {isLoading ? 'Saving...' : 'Next'} <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* Vigco Alert */}
      <VigcoAlert
        isOpen={showVigcoAlert}
        onClose={handleVigcoAlertClose}
        onContinue={handleVigcoAlertContinue}
      />
    </div>
  );
}