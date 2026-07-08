'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { mockOnboardingData } from '@/lib/mock-data';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showApiKey, setShowApiKey] = useState(false);

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleConfirm = () => {
    setShowApiKey(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Onboarding Setup</h1>
        <p className="text-muted-foreground mt-2">
          Complete the setup wizard to configure your trading environment
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center gap-4 flex-1">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                step < currentStep
                  ? 'bg-emerald-500 text-white'
                  : step === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {step < currentStep ? <Check className="h-5 w-5" /> : step}
            </div>
            {step < 4 && (
              <div
                className={`h-1 flex-1 ${
                  step < currentStep ? 'bg-emerald-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: VPS Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Input
                    id="provider"
                    defaultValue={mockOnboardingData.vps.provider}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    defaultValue={mockOnboardingData.vps.ipAddress}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="vpsUsername">VPS Username</Label>
                  <Input
                    id="vpsUsername"
                    defaultValue={mockOnboardingData.vps.vpsUsername}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="vpsPassword">VPS Password</Label>
                  <Input
                    id="vpsPassword"
                    type="password"
                    defaultValue={mockOnboardingData.vps.vpsPassword}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="loginUrl">Login URL</Label>
                  <Input
                    id="loginUrl"
                    defaultValue={mockOnboardingData.vps.loginUrl}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="panelUsername">Panel Username</Label>
                  <Input
                    id="panelUsername"
                    defaultValue={mockOnboardingData.vps.panelUsername}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="panelPassword">Panel Password</Label>
                  <Input
                    id="panelPassword"
                    type="password"
                    defaultValue={mockOnboardingData.vps.panelPassword}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="os">Operating System</Label>
                  <Select defaultValue={mockOnboardingData.vps.operatingSystem}>
                    <SelectTrigger id="os" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows Server 2022">Windows Server 2022</SelectItem>
                      <SelectItem value="Windows Server 2019">Windows Server 2019</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleNext} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Broker Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="brokerName">Broker Name</Label>
                  <Input
                    id="brokerName"
                    defaultValue={mockOnboardingData.broker.brokerName}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5Account">MT5 Account Number</Label>
                  <Input
                    id="mt5Account"
                    defaultValue={mockOnboardingData.broker.mt5AccountNumber}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5Password">MT5 Password</Label>
                  <Input
                    id="mt5Password"
                    type="password"
                    defaultValue={mockOnboardingData.broker.mt5Password}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5Server">MT5 Server</Label>
                  <Input
                    id="mt5Server"
                    defaultValue={mockOnboardingData.broker.mt5Server}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="brokerPassword">Broker Password</Label>
                  <Input
                    id="brokerPassword"
                    type="password"
                    defaultValue={mockOnboardingData.broker.brokerPassword}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button onClick={handleBack} variant="outline" className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Prop Firm Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="propFirmName">Prop Firm Name</Label>
                  <Input
                    id="propFirmName"
                    defaultValue={mockOnboardingData.propFirm.propFirmName}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="propMt5Account">MT5 Account Number</Label>
                  <Input
                    id="propMt5Account"
                    defaultValue={mockOnboardingData.propFirm.mt5AccountNumber}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="propMt5Password">MT5 Password</Label>
                  <Input
                    id="propMt5Password"
                    type="password"
                    defaultValue={mockOnboardingData.propFirm.mt5Password}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="propMt5Server">MT5 Server</Label>
                  <Input
                    id="propMt5Server"
                    defaultValue={mockOnboardingData.propFirm.mt5Server}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phase">Phase</Label>
                  <Select defaultValue={mockOnboardingData.propFirm.phase}>
                    <SelectTrigger id="phase" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Challenge">Challenge</SelectItem>
                      <SelectItem value="Funded">Funded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button onClick={handleBack} variant="outline" className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNext} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Confirm Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {!showApiKey ? (
                <>
                  <div className="space-y-4">
                    <div className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-3">VPS Configuration</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Provider</p>
                          <p className="text-foreground font-medium">{mockOnboardingData.vps.provider}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">IP Address</p>
                          <p className="text-foreground font-medium">{mockOnboardingData.vps.ipAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-3">Broker Configuration</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Broker Name</p>
                          <p className="text-foreground font-medium">{mockOnboardingData.broker.brokerName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">MT5 Server</p>
                          <p className="text-foreground font-medium">{mockOnboardingData.broker.mt5Server}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-3">Prop Firm Configuration</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Prop Firm Name</p>
                          <p className="text-foreground font-medium">{mockOnboardingData.propFirm.propFirmName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phase</p>
                          <Badge variant="default">{mockOnboardingData.propFirm.phase}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border">
                    <Button onClick={handleBack} variant="outline" className="gap-2">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleConfirm} className="gap-2">
                      <Check className="h-4 w-4" /> Confirm Setup
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Setup Completed!</h3>
                    </div>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-6">
                      Your setup has been confirmed. Here is your generated API key.
                    </p>

                    <div className="space-y-4 bg-white dark:bg-slate-950 rounded-lg p-4 border border-border">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">API Key</label>
                        <div className="mt-2 p-3 bg-muted rounded font-mono text-sm text-foreground break-all">
                          {mockOnboardingData.generatedApiKey.apiKey}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Prefix</label>
                          <p className="text-foreground mt-2 font-mono">{mockOnboardingData.generatedApiKey.prefix}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Environment</label>
                          <Badge variant="default" className="mt-2">{mockOnboardingData.generatedApiKey.environment}</Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                      💡 Save your API key in a secure location. It will not be displayed again.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
