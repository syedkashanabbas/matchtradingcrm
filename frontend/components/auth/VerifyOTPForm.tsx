'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function VerifyOTPForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('resetEmail');
    if (!storedEmail) {
      router.push('/forgot-password');
      return;
    }
    setEmail(storedEmail);

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp: otpValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid code');
      }

      setSuccess('Code verified successfully');

      // Redirect to reset password page after 1 second
      setTimeout(() => {
        sessionStorage.setItem('resetOtp', otpValue);
        router.push('/reset-password');
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setSuccess('New code sent to your email');
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(600); // Reset timer
      setError('');

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <p className="mb-1 text-sm text-muted-foreground">
          We sent a 6-digit code to
        </p>
        <p className="font-medium text-foreground">{email}</p>
      </div>

      <div className="space-y-3">
        <label className="block text-center text-sm font-medium text-foreground">
          Enter Verification Code
        </label>
        <div className="flex justify-center gap-2.5">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="h-12 w-12 rounded-xl border border-input bg-background text-center text-lg font-semibold tabular-nums text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          ))}
        </div>
      </div>

      {timeLeft > 0 ? (
        <div className="text-center text-sm text-muted-foreground">
          Code expires in <span className="font-medium tabular-nums text-foreground">{formatTime(timeLeft)}</span>
        </div>
      ) : (
        <div className="text-center text-sm font-medium text-destructive">
          Code has expired
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || otp.join('').length !== 6}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
        )}
        {isLoading ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className="space-y-2 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={isLoading || timeLeft > 540} // Disable resend for first minute
          className="text-sm text-muted-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {timeLeft > 540
            ? `Resend code in ${Math.floor((timeLeft - 540) / 60)}:${((timeLeft - 540) % 60).toString().padStart(2, '0')}`
            : "Didn't receive the code? Resend"
          }
        </button>

        <div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to email entry
          </Link>
        </div>
      </div>
    </form>
  );
}
