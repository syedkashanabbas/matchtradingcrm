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

interface VigcoAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function VigcoAlert({ 
  isOpen, 
  onClose, 
  onContinue
}: VigcoAlertProps) {
  if (!isOpen) return null;

  const handleOpenLink = () => {
    window.open('https://vigco.co/la-com-inv/zf58hHwC', '_blank');
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md mx-4">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-800 dark:to-indigo-800">
              <ExternalLink className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Important Account Setup Required
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-300">
                Before proceeding with broker setup, you need to create an account at vigco.co
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="px-6 py-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <div className="text-center">
              <div className="text-2xl mb-2">!IMPORTANT</div>
              <p className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                If you don't create an account here, your account won't be activated
              </p>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-300 dark:border-blue-600 mb-3">
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">Required Link:</div>
                <div className="text-sm font-mono text-blue-700 dark:text-blue-300 break-all">
                  https://vigco.co/la-com-inv/zf58hHwC
                </div>
              </div>
              <Button
                onClick={handleOpenLink}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Registration Link
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
