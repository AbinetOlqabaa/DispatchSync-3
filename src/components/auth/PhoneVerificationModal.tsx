import React, { useState } from 'react';
import { Phone, CheckCircle2, AlertCircle, ShieldAlert, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, verifyPhoneOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendStatus(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyPhoneOtp(otp.trim());
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    setError(null);
    setResendStatus('A new simulated code has been dispatched. Enter "123456" for sandbox testing.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100">
        <button
          onClick={onClose}
          aria-label="Close phone verification dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
        >
          ✕
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SMS Gateway Ready • Sandbox Mode</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Verify Phone Number</h2>
          <p className="text-sm text-slate-400 mt-1">
            Two-factor verification protects dispatch authorizations for{' '}
            <span className="text-slate-200 font-medium">{user?.phoneNumber || 'your registered device'}</span>.
          </p>
        </div>

        {/* Sandbox Instruction Notice */}
        <div className="p-3 mb-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs">
          <p className="font-semibold text-indigo-200">Sandbox Test Code:</p>
          <p className="mt-0.5">
            Enter <span className="font-mono bg-indigo-900/60 px-1.5 py-0.5 rounded text-white font-bold">123456</span> to complete phone verification. (Live SMS provider like Twilio/Firebase Auth will plug directly into this adapter).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{resendStatus}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              6-Digit One-Time Passcode (OTP)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                required
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-center font-mono text-lg tracking-widest text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={otp.length !== 6 || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Verifying Code...' : 'Confirm & Activate Profile'}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>Didn't receive SMS?</span>
            <button
              type="button"
              onClick={handleResend}
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Resend Code</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
