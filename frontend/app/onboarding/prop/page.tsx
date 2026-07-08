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

interface PropData {
  firmName: string;
  mt5AccountNumber: string;
  mt5Password: string;
  mt5Server: string;
  phase: 'CHALLENGE' | 'FUNDED';
}

export default function OnboardingPropPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PropData>({
    firmName: '',
    mt5AccountNumber: '',
    mt5Password: '',
    mt5Server: '',
    phase: 'CHALLENGE'
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

  const handleInputChange = (field: keyof PropData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.createProp(formData);
      router.push('/onboarding/review');
    } catch (error) {
      console.error('Error saving prop data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/onboarding/broker');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Building className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Prop Firm Configuration
          </h1>
          <p className="text-xl text-muted-foreground">
            Set up your prop firm account for funded trading challenges
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
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <span className="text-sm font-medium">Prop Firm</span>
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
            <CardTitle>Prop Firm Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="FundedNext-Live"
                    value={formData.mt5Server}
                    onChange={(e) => handleInputChange('mt5Server', e.target.value)}
                    className="mt-2"
                    required
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
                  disabled={isLoading || !formData.firmName || !formData.mt5AccountNumber || !formData.mt5Password || !formData.mt5Server}
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
