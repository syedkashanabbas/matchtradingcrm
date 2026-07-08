'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Check, AlertCircle, Server, Briefcase, Building, CreditCard, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';

interface OnboardingData {
  subscription?: {
    plan: string;
    price: string;
    status: string;
  };
  vps?: {
    provider: string;
    ipAddress: string;
    operatingSystem: string;
    status: string;
  };
  broker?: {
    brokerName: string;
    mt5AccountNumber: string;
    mt5Server: string;
    status: string;
  };
  prop?: {
    firmName: string;
    mt5AccountNumber: string;
    mt5Server: string;
    phase: string;
    status: string;
  };
}

export default function OnboardingReviewPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

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

    loadOnboardingData();
  }, [isAuthenticated, user, router]);

  const loadOnboardingData = async () => {
    try {
      // Load subscription info
      const subscription = await apiClient.getSubscriptionInfo();
      
      // Load VPS configs
      const vpsResponse = await apiClient.getVpsList();
      const vps = (vpsResponse as any).data?.[0];

      // Load broker accounts
      const brokerResponse = await apiClient.getBrokerList();
      const broker = (brokerResponse as any).data?.[0];

      // Load prop accounts
      const propResponse = await apiClient.getPropList();
      const prop = (propResponse as any).data?.[0];

      setOnboardingData({
        subscription: {
          plan: subscription.plan,
          price: subscription.plan === 'Free' ? '$0/month' : 
                subscription.plan === 'Pro' ? '$99/month' : '$299/month',
          status: subscription.status
        },
        vps: vps ? {
          provider: vps.provider,
          ipAddress: vps.ipAddress,
          operatingSystem: vps.operatingSystem || 'Windows Server 2022',
          status: vps.status
        } : undefined,
        broker: broker ? {
          brokerName: broker.brokerName,
          mt5AccountNumber: broker.mt5AccountNumber,
          mt5Server: broker.mt5Server,
          status: broker.status
        } : undefined,
        prop: prop ? {
          firmName: prop.firmName,
          mt5AccountNumber: prop.mt5AccountNumber,
          mt5Server: prop.mt5Server,
          phase: prop.phase,
          status: prop.isActive ? 'Active' : 'Inactive'
        } : undefined
      });
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      // Generate API key
      const response = await apiClient.createApiKey('Onboarding API Key');
      setApiKey((response as any).key || (response as any).apiKey || 'Generated API Key');
      setShowApiKey(true);
    } catch (error) {
      console.error('Error generating API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/onboarding/prop');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard/client');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Review Your Configuration
          </h1>
          <p className="text-xl text-muted-foreground">
            Confirm all your settings before completing the setup
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
              <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium">Broker</span>
            </div>
            <div className="h-1 w-16 bg-emerald-500" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium">Prop Firm</span>
            </div>
            <div className="h-1 w-16 bg-emerald-500" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                5
              </div>
              <span className="text-sm font-medium">Review</span>
            </div>
          </div>
        </div>

        {!showApiKey ? (
          <>
            {/* Configuration Summary */}
            <div className="space-y-6">
              {/* Subscription */}
              {onboardingData?.subscription && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Subscription Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="font-semibold text-foreground">{onboardingData.subscription.plan}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="font-semibold text-foreground">{onboardingData.subscription.price}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={onboardingData.subscription.status === 'active' ? 'default' : 'secondary'}>
                          {onboardingData.subscription.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* VPS */}
              {onboardingData?.vps && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      VPS Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Provider</p>
                        <p className="font-semibold text-foreground">{onboardingData.vps.provider}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IP Address</p>
                        <p className="font-mono text-sm text-foreground">{onboardingData.vps.ipAddress}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Operating System</p>
                        <p className="font-semibold text-foreground">{onboardingData.vps.operatingSystem}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={onboardingData.vps.status === 'active' ? 'default' : 'secondary'}>
                          {onboardingData.vps.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Broker */}
              {onboardingData?.broker && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Broker Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Broker Name</p>
                        <p className="font-semibold text-foreground">{onboardingData.broker.brokerName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">MT5 Account</p>
                        <p className="font-mono text-sm text-foreground">{onboardingData.broker.mt5AccountNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">MT5 Server</p>
                        <p className="font-semibold text-foreground">{onboardingData.broker.mt5Server}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={onboardingData.broker.status === 'active' ? 'default' : 'secondary'}>
                          {onboardingData.broker.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prop Firm */}
              {onboardingData?.prop && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Prop Firm Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Firm Name</p>
                        <p className="font-semibold text-foreground">{onboardingData.prop.firmName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">MT5 Account</p>
                        <p className="font-mono text-sm text-foreground">{onboardingData.prop.mt5AccountNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phase</p>
                        <Badge variant={onboardingData.prop.phase === 'FUNDED' ? 'default' : 'secondary'}>
                          {onboardingData.prop.phase}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={onboardingData.prop.status === 'Active' ? 'default' : 'secondary'}>
                          {onboardingData.prop.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">Important Notice</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Please review all your configuration details carefully. Once confirmed, you will receive an API key that will be used to connect your trading systems.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className="gap-2"
                size="lg"
              >
                {isLoading ? 'Processing...' : 'Confirm Setup'} <Check className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          /* API Key Generated */
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Setup Completed!</h2>
                  <p className="text-muted-foreground">
                    Your trading environment has been configured successfully. Here is your API key:
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-6 max-w-md mx-auto">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">API Key</label>
                      <div className="mt-2 p-3 bg-background rounded font-mono text-sm text-foreground break-all border border-border">
                        {apiKey}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      💡 Save this API key in a secure location. It will not be displayed again.
                    </div>
                  </div>
                </div>

                <Button onClick={handleGoToDashboard} size="lg" className="gap-2">
                  Go to Dashboard <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
