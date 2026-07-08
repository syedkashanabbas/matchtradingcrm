'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Check, AlertCircle, Server, Briefcase, Building, CreditCard } from 'lucide-react';
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

// Helper function to get correct price based on plan
const getPlanPrice = (plan: string): string => {
  switch (plan?.toUpperCase()) {
    case 'FREE':
      return '$0/month';
    case 'PRO':
      return '$99/month';
    case 'ENTERPRISE':
      return '$299/month';
    default:
      return '$0/month';
  }
};

export default function ClientOnboardingReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, updateApiKeys } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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

    // Check for successful payment
    const success = searchParams.get('success');
    if (success === 'true') {
      setPaymentSuccess(true);
    }

    loadOnboardingData();
  }, [isAuthenticated, user, router, searchParams]);

  const loadOnboardingData = async () => {
    try {
      // Get selected plan data from sessionStorage
      const storedPlan = sessionStorage.getItem('selectedPlan');
      let selectedPlanData = null;
      
      if (storedPlan) {
        try {
          selectedPlanData = JSON.parse(storedPlan);
        } catch (error) {
          console.error('Error parsing stored plan data:', error);
        }
      }

      // Load subscription info from backend (for status)
      const subscription = await apiClient.getSubscriptionInfo();
      
      // Load VPS configs
      const vpsResponse = await apiClient.getVpsList();
      console.log('VPS Response:', vpsResponse);
      const vps = Array.isArray(vpsResponse) ? vpsResponse[0] : (vpsResponse as any).data?.[0];
      console.log('VPS Data:', vps);

      // Load broker accounts
      const brokerResponse = await apiClient.getBrokerList();
      console.log('Broker Response:', brokerResponse);
      const broker = Array.isArray(brokerResponse) ? brokerResponse[0] : (brokerResponse as any).data?.[0];
      console.log('Broker Data:', broker);

      // Use stored plan data for display, fallback to backend data
      const planName = selectedPlanData?.name || (subscription as any).plan;
      const planPrice = selectedPlanData?.price || getPlanPrice((subscription as any).plan);

      const onboardingData: OnboardingData = {
        subscription: {
          plan: planName,
          price: planPrice,
          status: (subscription as any).status
        },
        vps: vps ? {
          provider: vps.provider,
          ipAddress: vps.ipAddress,
          operatingSystem: vps.operatingSystem || 'Windows Server 2022',
          status: 'review'
        } : undefined,
        broker: broker ? {
          brokerName: broker.brokerName,
          mt5AccountNumber: broker.mt5AccountNumber,
          mt5Server: broker.mt5Server,
          status: 'review'
        } : undefined
      };

      // Load prop accounts (optional - not part of main flow)
      try {
        const propResponse = await apiClient.getPropList();
        const prop = Array.isArray(propResponse) ? propResponse[0] : (propResponse as any).data?.[0];
        if (prop) {
          onboardingData.prop = {
            firmName: prop.firmName,
            mt5AccountNumber: prop.mt5AccountNumber,
            mt5Server: prop.mt5Server,
            phase: prop.phase,
            status: 'review'
          };
        }
      } catch (error) {
        // Prop firm is optional, ignore errors
        console.log('Prop firm not configured (optional)');
      }

      setOnboardingData(onboardingData);
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      // Get stored plan data
      const storedPlan = sessionStorage.getItem('selectedPlan');
      let selectedPlanData = null;
      
      if (storedPlan) {
        try {
          selectedPlanData = JSON.parse(storedPlan);
        } catch (error) {
          console.error('Error parsing stored plan data:', error);
        }
      }

      // Check current subscription status
      const subscription = await apiClient.getSubscriptionInfo();
      const currentStatus = (subscription as any).status;
      
      console.log('Stored plan data:', selectedPlanData);
      console.log('Current subscription status:', currentStatus);
      
      // If user already has active subscription, generate API key and complete
      if (currentStatus === 'ACTIVE') {
        console.log('User already has active subscription - generating API key');
        await generateApiKeyAndComplete();
      } else if (!selectedPlanData || selectedPlanData.id === 'free') {
        // For FREE plan, call API to save subscription to database first
        console.log('Creating FREE plan subscription - saving to database first');
        const response = await apiClient.createCheckoutSession('free');
        if (response.message === 'Free plan activated') {
          console.log('FREE plan saved to database successfully');
          await generateApiKeyAndComplete();
        } else {
          console.error('Failed to save FREE plan to database:', response);
          // Fallback: generate API key and complete
          await generateApiKeyAndComplete();
        }
      } else {
        // For paid plans that need payment, redirect to Stripe
        console.log('Payment needed for plan:', selectedPlanData.id);
        const response = await apiClient.createCheckoutSession(selectedPlanData.id);
        if (response.url) {
          // Redirect to Stripe checkout
          window.location.href = response.url;
        } else {
          // Fallback: generate API key and complete
          await generateApiKeyAndComplete();
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      // Fallback: generate API key and complete
      await generateApiKeyAndComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKeyAndComplete = async () => {
    try {
      // Generate API key
      const response = await apiClient.createApiKey('Onboarding API Key');
      console.log('API Key Response:', response);
      
      // Extract the actual API key string from the response
      let apiKeyString = 'Generated API Key';
      if (response && typeof response === 'object') {
        // Handle wrapped response: {message, apiKey: {id, name, key, createdAt}}
        if ((response as any).apiKey && (response as any).apiKey.key) {
          apiKeyString = (response as any).apiKey.key;
        }
        // Handle direct response: {id, name, key, createdAt}
        else if ((response as any).key) {
          apiKeyString = (response as any).key;
        }
        // Fallback to other possible fields
        else {
          apiKeyString = (response as any).apiKey || (response as any).id || 'Generated API Key';
        }
      } else if (typeof response === 'string') {
        apiKeyString = response;
      }
      
      console.log('Extracted API Key:', apiKeyString);
      setApiKey(apiKeyString);
      
      // Add the new API key to the user's API keys list
      const newApiKey = {
        id: Date.now().toString(),
        name: 'Onboarding API Key',
        key: apiKeyString,
        lastFour: apiKeyString.slice(-4),
        prefix: apiKeyString.substring(0, 8) + '...',
        environment: 'Live',
        status: 'active',
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };
      
      updateApiKeys(newApiKey);
      setShowApiKey(true);
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/client/onboarding/payment');
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Clean up sessionStorage
      sessionStorage.removeItem('selectedPlan');
      
      // Show success message
      alert('Congratulations! You have successfully completed all onboarding steps. Your account is now fully set up and ready to use. You can now access all features of the platform.');
      
      // Wait a moment before redirecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/dashboard/client');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('There was an error completing your setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Review Your Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Review all your settings before completing the setup
        </p>
      </div>

      {/* Payment Success Message */}
      {paymentSuccess && (
        <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200 flex items-center gap-3">
          <Check className="h-5 w-5" />
          <span className="font-medium">Payment successful! Your subscription is now active.</span>
        </div>
      )}

      {/* Progress */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <span className="text-sm text-muted-foreground">VPS</span>
            </div>
            <div className="h-1 w-16 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="text-sm text-muted-foreground">Broker</span>
            </div>
            <div className="h-1 w-16 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="text-sm text-muted-foreground">Prop Firm</span>
            </div>
            <div className="h-1 w-16 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <span className="text-sm text-muted-foreground">Payment</span>
            </div>
            <div className="h-1 w-16 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                5
              </div>
              <span className="text-sm font-medium">Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboardingData?.subscription ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan:</span>
                  <span className="font-medium">{onboardingData.subscription.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price:</span>
                  <span className="font-medium">{onboardingData.subscription.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={onboardingData.subscription.status === 'active' ? 'default' : 'secondary'}>
                    {onboardingData.subscription.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No subscription configured</p>
            )}
          </CardContent>
        </Card>

        {/* VPS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              VPS Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboardingData?.vps ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Provider:</span>
                  <span className="font-medium">{onboardingData.vps.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">IP Address:</span>
                  <span className="font-medium">{onboardingData.vps.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">OS:</span>
                  <span className="font-medium">{onboardingData.vps.operatingSystem}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={onboardingData.vps.status === 'active' ? 'default' : 'secondary'}>
                    {onboardingData.vps.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No VPS configured</p>
            )}
          </CardContent>
        </Card>

        {/* Broker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Broker Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboardingData?.broker ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Broker:</span>
                  <span className="font-medium">{onboardingData.broker.brokerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account:</span>
                  <span className="font-medium">{onboardingData.broker.mt5AccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Server:</span>
                  <span className="font-medium">{onboardingData.broker.mt5Server}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={onboardingData.broker.status === 'active' ? 'default' : 'secondary'}>
                    {onboardingData.broker.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No broker configured</p>
            )}
          </CardContent>
        </Card>

        {/* Prop Firm - Optional */}
        {onboardingData?.prop && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Prop Firm Account (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Firm:</span>
                  <span className="font-medium">{onboardingData.prop.firmName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account:</span>
                  <span className="font-medium">{onboardingData.prop.mt5AccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phase:</span>
                  <span className="font-medium">{onboardingData.prop.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={onboardingData.prop.status === 'Active' ? 'default' : 'secondary'}>
                    {onboardingData.prop.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* API Key Display */}
      {showApiKey && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Check className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800 dark:text-green-200">API Key Generated</h3>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
              <code className="text-sm font-mono text-green-700 dark:text-green-300">{apiKey}</code>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2">
              Save this API key securely. You won't be able to see it again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isLoading}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        
        <div className="flex gap-3">
          {!showApiKey ? (
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? 'Processing...' : 'Confirm & Complete Setup'} <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="gap-2"
            >
              Go to Dashboard <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
