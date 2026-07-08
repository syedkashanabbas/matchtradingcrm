'use client';

import { useOnboardingStatus } from '@/lib/use-onboarding-status';

export function OnboardingBanner() {
  const { onboardingData, isLoading } = useOnboardingStatus();

  // Don't show banner if loading, onboarding is complete, or data is not available
  if (isLoading || !onboardingData || onboardingData.isComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Centered Content */}
          <div className="text-center space-y-6">
            {/* Loader/Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg 
                    className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8 8 0 01-8 8v0H4z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your Request Has Been Submitted
            </h1>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
              Your onboarding details have been successfully submitted to admin. 
              Once admin reviews and verifies your information, your account will be activated and full dashboard access will be unlocked.
            </p>

            {/* Network Info */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
              <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                In the meantime, you can start building your network. Share your referral link with others and invite them to join.
              </p>
            </div>

            {/* Footer Note */}
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m0 0l-3-3m3 3v-4m0-6l-3-3" />
                </svg>
                <span className="text-xs">Please wait while your account is being reviewed.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
