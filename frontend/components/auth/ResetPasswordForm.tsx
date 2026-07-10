'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const inputClasses =
  'h-11 w-full rounded-xl border border-input bg-background px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50';

export function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Get email + verified OTP from sessionStorage
    const storedEmail = sessionStorage.getItem('resetEmail');
    const storedOtp = sessionStorage.getItem('resetOtp');
    if (!storedEmail || !storedOtp) {
      router.push('/forgot-password');
      return;
    }
    setEmail(storedEmail);
    setOtp(storedOtp);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess('Password reset successfully');

      // Clear sessionStorage
      sessionStorage.removeItem('resetEmail');
      sessionStorage.removeItem('resetOtp');

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { text: 'Too short', color: 'text-destructive' };
    if (password.length < 8) return { text: 'Weak', color: 'text-warning' };
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) return { text: 'Fair', color: 'text-warning' };
    if (!/[0-9]/.test(password)) return { text: 'Good', color: 'text-primary' };
    return { text: 'Strong', color: 'text-success' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/10 p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      <div className="rounded-xl bg-muted/40 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Resetting password for
        </p>
        <p className="font-medium text-foreground">{email}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="newPassword" className="block text-sm font-medium text-foreground">
          New Password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            value={formData.newPassword}
            onChange={handleChange}
            disabled={isLoading}
            required
            className={inputClasses}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle password visibility"
          >
            {showPassword ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
        {formData.newPassword && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Password strength</span>
            <span className={`font-medium ${passwordStrength.color}`}>{passwordStrength.text}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            required
            className={inputClasses}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle confirm password visibility"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
        {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="mb-1.5 font-medium text-foreground">Password requirements</p>
        <ul className="space-y-1">
          <li>At least 6 characters long</li>
          <li>Mix of uppercase and lowercase letters (recommended)</li>
          <li>Include numbers (recommended)</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={isLoading || !formData.newPassword || !formData.confirmPassword || formData.newPassword !== formData.confirmPassword}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
        )}
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}
