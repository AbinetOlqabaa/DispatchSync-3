import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, X, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface NotificationBannerProps {
  onOpenPhoneVerify?: () => void;
  onNavigateStatus?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  onOpenPhoneVerify,
  onNavigateStatus,
}) => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="space-y-2 px-4 pt-3 max-w-7xl mx-auto">
      {/* Sandbox Isolation Notice */}
      {!dismissed && (
        <div className="bg-amber-950/70 border border-amber-800/80 rounded-xl px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded bg-amber-900/80 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div>
              <span className="font-semibold text-amber-100">Sandbox Kernel Mode:</span> Running isolated development provider with mock persistence. Real credentials are not connected yet.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateStatus && (
              <button
                onClick={onNavigateStatus}
                className="underline hover:text-white font-medium cursor-pointer"
              >
                Inspect Setup & Status
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-400 hover:text-white p-0.5 rounded cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Phone verification alert */}
      {user && !user.phoneVerified && onOpenPhoneVerify && (
        <div className="bg-indigo-950/80 border border-indigo-700/80 rounded-xl px-4 py-2.5 text-xs text-indigo-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded bg-indigo-900 text-indigo-300">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
            <div>
              <span className="font-semibold text-indigo-100">Phone Verification Required:</span> Verify your mobile number ({user.phoneNumber}) to receive automated SMS dispatch alerts.
            </div>
          </div>
          <button
            onClick={onOpenPhoneVerify}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer transition-colors"
          >
            Verify Code
          </button>
        </div>
      )}
    </div>
  );
};
