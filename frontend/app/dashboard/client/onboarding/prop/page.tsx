'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Building } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';
import { FtmoAlert } from '@/components/ui/ftmo-alert';

interface PropData {
  prop_firm_name: string;
  phase: string;
  mt5_account_number: string;
  mt5_password: string;
  mt5_server: string;
  prop_firm_password?: string;
  ftmo_credit_detail?: string;
  ftmo_account_detail?: string;
  ftmo_user_name?: string;
}

export default function ClientOnboardingPropPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showFtmoAlert, setShowFtmoAlert] = useState(false);
  const [formData, setFormData] = useState<PropData>({
    prop_firm_name: '',
    phase: 'challenge',
    mt5_account_number: '',
    mt5_password: '',
    mt5_server: '',
    prop_firm_password: '',
    ftmo_credit_detail: '',
    ftmo_account_detail: '',
    ftmo_user_name: '',
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

    // Check if user came from broker form by checking the referrer
    const referrer = document.referrer;
    if (referrer.includes('/broker') || sessionStorage.getItem('fromBroker') === 'true') {
      setShowFtmoAlert(true);
      sessionStorage.removeItem('fromBroker');
    }
  }, [isAuthenticated, user, router]);

  const handleInputChange = (field: keyof PropData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.post('/v1/onboarding/prop', formData);
      router.push('/dashboard/client/onboarding/payment');
    } catch (error) {
      console.error('Error saving prop firm configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/client/onboarding/broker');
  };

  const handleFtmoAlertClose = () => {
    setShowFtmoAlert(false);
  };

  const handleFtmoAlertContinue = () => {
    setShowFtmoAlert(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Building className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
          </div>
          Prop Firm Configuration
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Set up your proprietary trading firm account
        </p>
      </div>

      {/* Progress */}
      <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 min-w-max px-2 sm:px-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                1
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">VPS</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-primary flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                2
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Broker</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-primary flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                3
              </div>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Prop Firm</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                4
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Payment</span>
            </div>
            <div className="h-1 w-8 sm:w-16 bg-muted flex-shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                5
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Prop Firm Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="prop_firm_name">Prop Firm Name *</Label>
                <Input
                  id="prop_firm_name"
                  type="text"
                  placeholder="e.g., FTMO, MyForexFunds"
                  value={formData.prop_firm_name}
                  onChange={(e) => handleInputChange('prop_firm_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase">Phase *</Label>
                <Select value={formData.phase} onValueChange={(value) => handleInputChange('phase', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="challenge">Challenge</SelectItem>
                    <SelectItem value="funded">Funded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mt5_account_number">MT5 Account Number *</Label>
                <Input
                  id="mt5_account_number"
                  type="text"
                  placeholder="123456789"
                  value={formData.mt5_account_number}
                  onChange={(e) => handleInputChange('mt5_account_number', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mt5_password">MT5 Password *</Label>
                <Input
                  id="mt5_password"
                  type="password"
                  placeholder="Enter MT5 password"
                  value={formData.mt5_password}
                  onChange={(e) => handleInputChange('mt5_password', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mt5_server">MT5 Server *</Label>
                <Input
                  id="mt5_server"
                  type="text"
                  placeholder="e.g., MetaQuotes-Demo"
                  value={formData.mt5_server}
                  onChange={(e) => handleInputChange('mt5_server', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prop_firm_password">Prop Firm Password (Optional)</Label>
                <Input
                  id="prop_firm_password"
                  type="password"
                  placeholder="Enter prop firm password"
                  value={formData.prop_firm_password}
                  onChange={(e) => handleInputChange('prop_firm_password', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ftmo_credit_detail">FTMO Credit Detail</Label>
                <Input
                  id="ftmo_credit_detail"
                  type="text"
                  placeholder="Enter FTMO credit detail"
                  value={formData.ftmo_credit_detail || ''}
                  onChange={(e) => handleInputChange('ftmo_credit_detail', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ftmo_account_detail">FTMO Account Detail</Label>
                <Input
                  id="ftmo_account_detail"
                  type="text"
                  placeholder="Enter FTMO account detail"
                  value={formData.ftmo_account_detail || ''}
                  onChange={(e) => handleInputChange('ftmo_account_detail', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ftmo_user_name">FTMO User Name</Label>
                <Input
                  id="ftmo_user_name"
                  type="text"
                  placeholder="Enter FTMO user name"
                  value={formData.ftmo_user_name || ''}
                  onChange={(e) => handleInputChange('ftmo_user_name', e.target.value)}
                />
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
                disabled={isLoading || !formData.prop_firm_name || !formData.mt5_account_number || !formData.mt5_password || !formData.mt5_server}
                className="gap-2"
              >
                {isLoading ? 'Saving...' : 'Next'} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* FTMO Alert */}
      <FtmoAlert
        isOpen={showFtmoAlert}
        onClose={handleFtmoAlertClose}
        onContinue={handleFtmoAlertContinue}
      />
    </div>
  );
}
