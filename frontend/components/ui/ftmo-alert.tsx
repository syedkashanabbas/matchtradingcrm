'use client';

import { ExternalLink, X } from 'lucide-react';
import { Button } from './button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';

interface FtmoAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function FtmoAlert({ 
  isOpen, 
  onClose, 
  onContinue
}: FtmoAlertProps) {
  if (!isOpen) return null;

  const handleOpenLink = () => {
    window.open('https://trader.ftmo.com/?affiliates=mCtOxNQkCQpZIPBCKgpG', '_blank');
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md mx-4">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800">
              <ExternalLink className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Important Prop Firm Setup Required
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-300">
                Before proceeding with prop firm setup, you need to create an account at FTMO
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="px-6 py-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <div className="text-center">
              <div className="text-2xl mb-2">!IMPORTANT</div>
              <p className="font-semibold text-purple-800 dark:text-purple-200 mb-3">
                If you don't create an account here, your account won't be activated
              </p>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-300 dark:border-purple-600 mb-3">
                <div className="text-xs text-purple-600 dark:text-purple-400 mb-1 font-medium">Required Link:</div>
                <div className="text-sm font-mono text-purple-700 dark:text-purple-300 break-all">
                  https://trader.ftmo.com/?affiliates=mCtOxNQkCQpZIPBCKgpG
                </div>
              </div>
              <Button
                onClick={handleOpenLink}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open FTMO Registration
              </Button>
            </div>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onContinue}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg"
          >
            Fill the Form
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
