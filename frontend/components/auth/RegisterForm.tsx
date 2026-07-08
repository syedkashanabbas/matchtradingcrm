'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthContext } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { ReferralAlert } from '@/components/ui/referral-alert';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralBanner, setShowReferralBanner] = useState(false);
  const [inviterInfo, setInviterInfo] = useState<{ firstName: string; lastName: string; fullName: string } | null>(null);
  const [loadingInviter, setLoadingInviter] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualReferralCode, setManualReferralCode] = useState('');
  const [referralValidationError, setReferralValidationError] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);

  // Function to fetch inviter information
  const fetchInviterInfo = async (refCode: string) => {
    if (!refCode) return;
    
    try {
      setLoadingInviter(true);
      const response = await apiClient.getInviterInfo(refCode);
      const data = response.data || response;
      setInviterInfo(data as { firstName: string; lastName: string; fullName: string } | null);
    } catch (error) {
      console.error('Failed to fetch inviter info:', error);
      // Don't show error to user, just don't display inviter info
    } finally {
      setLoadingInviter(false);
    }
  };

  // Function to extract referral code from URL or code
  const extractReferralCode = (input: string): string => {
    if (!input.trim()) return '';
    
    // Check if it's a URL with ref parameter
    if (input.includes('/join?ref=')) {
      const url = new URL(input);
      const refCode = url.searchParams.get('ref');
      return refCode || '';
    }
    
    // Check if it's a URL with ref parameter in different format
    if (input.includes('ref=')) {
      const match = input.match(/ref=([^&]+)/);
      return match ? match[1] : '';
    }
    
    // Otherwise, treat as direct referral code
    return input.trim();
  };

  // Function to validate manual referral code
  const validateManualReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralValidationError('');
      return true; // Empty is valid (optional field)
    }

    setIsValidatingReferral(true);
    setReferralValidationError('');

    try {
      // Extract referral code from URL or use directly
      const referralCode = extractReferralCode(code);
      
      if (!referralCode) {
        setReferralValidationError('Invalid referral format');
        return false;
      }
      
      const response = await apiClient.getInviterInfo(referralCode);
      const data = response.data || response;
      
      if (data) {
        // Valid referral code, update the stored referral code
        setReferralCode(referralCode);
        localStorage.setItem('refCode', referralCode);
        setInviterInfo(data as { firstName: string; lastName: string; fullName: string });
        return true;
      } else {
        setReferralValidationError('Invalid referral code');
        return false;
      }
    } catch (error) {
      setReferralValidationError('Invalid referral code');
      return false;
    } finally {
      setIsValidatingReferral(false);
    }
  };

  // Handle manual referral code input change
  const handleManualReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setManualReferralCode(value);
    
    // Clear validation error when user starts typing
    if (referralValidationError) {
      setReferralValidationError('');
    }
  };

  // Handle blur event for referral code validation
  const handleReferralBlur = () => {
    if (manualReferralCode.trim()) {
      validateManualReferralCode(manualReferralCode);
    }
  };

  // Check for referral code on component mount
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      localStorage.setItem('refCode', refCode);
      setShowReferralBanner(true);
      // Fetch inviter information
      fetchInviterInfo(refCode);
    } else {
      // Check if there's a stored referral code
      const storedRefCode = localStorage.getItem('refCode');
      if (storedRefCode) {
        setReferralCode(storedRefCode);
        setShowReferralBanner(true);
        // Fetch inviter information
        fetchInviterInfo(storedRefCode);
      }
    }
  }, [searchParams]);

  // Show custom alert when inviter info is loaded
  useEffect(() => {
    if (showReferralBanner && inviterInfo) {
      // Don't show alert immediately, let user see it first
    }
  }, [showReferralBanner, inviterInfo]);

  const handleAlertClose = () => {
    setShowReferralBanner(false);
  };

  const validateForm = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[0-9]{10,15}$/.test(formData.phone.replace(/[^0-9+]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms';
    }

    // Validate manual referral code if provided
    if (manualReferralCode.trim() && !referralCode) {
      // If manual code is provided but not validated, validate it now
      const isValid = await validateManualReferralCode(manualReferralCode);
      if (!isValid) {
        newErrors.referral = 'Invalid referral code';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      // Get referral code (from URL, manual input, or localStorage)
      const finalRefCode = referralCode || localStorage.getItem('refCode') || undefined;
      
      // Call real registration API with referral code if available
      await apiClient.register(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.phone,
        formData.password,
        finalRefCode
      );
      
      // Show success message if referral was applied
      if (finalRefCode) {
        // You could add a success notification here
        console.log('You have successfully joined under a referral');
      }
      
      // Clear referral code after successful registration
      localStorage.removeItem('refCode');
      
      // After successful registration, log the user in
      await login(formData.email, formData.password);
      
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };



  return (
    <>
      {/* Custom Referral Alert */}
      <ReferralAlert
        isOpen={showReferralBanner && !!inviterInfo}
        onClose={handleAlertClose}
        title="Special Invitation!"
        message="You've been invited to join MatchTrading"
        referralCode={referralCode}
        inviterName={inviterInfo?.fullName}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* First Name */}
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
              errors.firstName
                ? 'border-red-500 focus:border-red-500'
                : 'border-input bg-background focus:border-primary'
            }`}
          />
          {errors.firstName && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
              errors.lastName
                ? 'border-red-500 focus:border-red-500'
                : 'border-input bg-background focus:border-primary'
            }`}
          />
          {errors.lastName && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email Address */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
            errors.email
              ? 'border-red-500 focus:border-red-500'
              : 'border-input bg-background focus:border-primary'
            }`}
        />
        {errors.email && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={formData.phone}
          onChange={handleChange}
          disabled={isLoading}
          className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
            errors.phone
              ? 'border-red-500 focus:border-red-500'
              : 'border-input bg-background focus:border-primary'
          }`}
        />
        {errors.phone && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.phone}</p>
        )}
      </div>

      {/* Referral Code / Link */}
      <div className="space-y-1.5">
        <label htmlFor="referralCode" className="block text-sm font-medium text-foreground">
          Referral Code / Referral Link <span className="text-muted-foreground">(Optional)</span>
        </label>
        <input
          id="referralCode"
          name="referralCode"
          type="text"
          placeholder="Enter referral code or paste referral link"
          value={manualReferralCode}
          onChange={handleManualReferralChange}
          onBlur={handleReferralBlur}
          disabled={isLoading || isValidatingReferral}
          className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
            referralValidationError || errors.referral
              ? 'border-red-500 focus:border-red-500'
              : 'border-input bg-background focus:border-primary'
          }`}
        />
        {(referralValidationError || errors.referral) && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {referralValidationError || errors.referral}
          </p>
        )}
        {isValidatingReferral && (
          <p className="text-xs text-muted-foreground">Validating referral code...</p>
        )}
        {inviterInfo && !showReferralBanner && (
          <p className="text-xs text-green-600 dark:text-green-400">
            You're joining under {inviterInfo.fullName}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
              errors.password
                ? 'border-red-500 focus:border-red-500'
                : 'border-input bg-background focus:border-primary'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle password visibility"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
              errors.confirmPassword
                ? 'border-red-500 focus:border-red-500'
                : 'border-input bg-background focus:border-primary'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle password visibility"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
        )}
      </div>

      <div className="flex items-start">
        <input
          id="terms"
          type="checkbox"
          checked={agreeToTerms}
          onChange={(e) => {
            setAgreeToTerms(e.target.checked);
            setErrors(prev => ({ ...prev, terms: '' }));
          }}
          disabled={isLoading}
          className="mt-1 h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50"
        />
        <label htmlFor="terms" className="ml-2 text-sm text-muted-foreground cursor-pointer">
          I agree to the{' '}
          <Link href="#" className="text-primary hover:underline">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="#" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </label>
      </div>
      {errors.terms && (
        <p className="text-xs text-red-600 dark:text-red-400">{errors.terms}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading && (
          <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        )}
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-2 text-muted-foreground">
            Already have an account?
          </span>
        </div>
      </div>

      <Link
        href="/login"
        className="block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-center font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50"
      >
        Sign In
      </Link>
      </form>
    </>
  );
}
