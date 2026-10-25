import React, { useState } from 'react';
import {
  Smartphone,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { SUPPORTED_COUNTRIES, normalizeToE164 } from '../../utils/phoneUtils.js';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToSignIn: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  onBackToSignIn,
}) => {
  const [step, setStep] = useState<'IDENTITY' | 'OTP'>('IDENTITY');
  const [selectedCountry, setSelectedCountry] = useState(SUPPORTED_COUNTRIES[0]); // Ethiopia (+251)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fan, setFan] = useState('');
  const [fin, setFin] = useState('');

  // Step 2 OTP & New Password state
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [maskedPhonePreview, setMaskedPhonePreview] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanFan = fan.replace(/\D/g, '');
  const cleanFin = fin.replace(/\D/g, '');

  const handleInitiateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!phoneNumber.trim()) {
      setError('Please provide your registered mobile number.');
      return;
    }
    if (cleanFan.length !== 16) {
      setError('FAN (Fayda Account Number) must be exactly 16 numeric digits.');
      return;
    }
    if (cleanFin.length !== 12) {
      setError('FIN (Fayda Identification Number) must be exactly 12 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const challenge = await api.initiateIdentityPasswordReset({
        phoneNumber: normalizeToE164(phoneNumber, selectedCountry.dialCode),
        fan: cleanFan,
        fin: cleanFin,
      });

      setChallengeId(challenge.challengeId);
      setMaskedPhonePreview(challenge.maskedPhone);
      if (challenge.simulatedCode) {
        setSimulatedCode(challenge.simulatedCode);
        setOtpCode(challenge.simulatedCode);
      }
      setStep('OTP');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identity verification failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!challengeId || !otpCode.trim()) {
      setError('Please provide the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.completeIdentityPasswordReset(challengeId, otpCode.trim(), newPassword);
      setStatusMessage(res.message || 'Password reset successfully! You can now sign in.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        <button
          onClick={onClose}
          aria-label="Close password reset dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          ✕
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Identity-Protected Recovery</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Reset Account Password</h2>
          <p className="text-sm text-slate-400 mt-1">
            Authenticate your Fayda identity credentials to dispatch a recovery OTP to your bound phone number.
          </p>
        </div>

        {statusMessage ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-200">Password Reset Complete</p>
                <p className="mt-1 text-slate-300">{statusMessage}</p>
              </div>
            </div>
            <button
              onClick={onBackToSignIn}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {step === 'IDENTITY' ? (
              <form onSubmit={handleInitiateRecovery} className="space-y-4">
                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Registered Mobile Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label="Country dial code"
                      value={selectedCountry.code}
                      onChange={(e) => {
                        const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                        if (found) setSelectedCountry(found);
                      }}
                      className="bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                          {c.flag} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={selectedCountry.samplePlaceholder}
                        required
                        className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* FAN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      FAN (Fayda Account Number - 16 digits) <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">{cleanFan.length}/16</span>
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                    <input
                      type="text"
                      maxLength={16}
                      value={fan}
                      onChange={(e) => setFan(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234567812345678"
                      required
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                {/* FIN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      FIN (Fayda Identification Number - 12 digits) <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">{cleanFin.length}/12</span>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    <input
                      type="text"
                      maxLength={12}
                      value={fin}
                      onChange={(e) => setFin(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456789012"
                      required
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || cleanFan.length !== 16 || cleanFin.length !== 12 || !phoneNumber.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Verifying Identity...</span>
                  ) : (
                    <>
                      <span>Verify & Send Recovery OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBackToSignIn}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 pt-2 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </form>
            ) : (
              /* Step 2: OTP + New Password */
              <form onSubmit={handleCompleteRecovery} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Recovery Phone:</span>
                    <span className="font-mono text-white font-semibold">{maskedPhonePreview}</span>
                  </div>
                  {simulatedCode && (
                    <div className="p-2 rounded bg-sky-950/80 border border-sky-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-sky-300">Dev Simulated OTP:</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                        {simulatedCode}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Enter 6-Digit OTP Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    New Password (min 8 chars) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm New Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('IDENTITY')}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || otpCode.length < 6 || newPassword.length < 8}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Updating...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
