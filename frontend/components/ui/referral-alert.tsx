'use client';

import { Gift, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from './alert-dialog';

interface ReferralAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  referralCode: string;
  inviterName?: string;
}

export function ReferralAlert({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  referralCode,
  inviterName 
}: ReferralAlertProps) {
  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md mx-4">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800">
              <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-300">
                {message}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="px-6 py-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <div className="text-center">
              <div className="text-2xl mb-2">🎉</div>
              {inviterName ? (
                <p className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  You've been invited by <span className="text-lg">{inviterName}</span>!
                </p>
              ) : (
                <p className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  You have a referral code!
                </p>
              )}
              <div className="text-sm text-green-700 dark:text-green-300">
                <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-green-300 dark:border-green-600">
                  {referralCode}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg"
          >
            Get Started
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
