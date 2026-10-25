import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Smartphone,
  Building2,
  Check,
  X,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { SUPPORTED_COUNTRIES, normalizeToE164, isValidE164 } from '../../utils/phoneUtils.js';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn: () => void;
  onOpenPhoneVerification?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onOpenSignIn,
}) => {
  const { login } = useAuth();

  // Step 1: Registration Form State
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(SUPPORTED_COUNTRIES[0]); // Ethiopia (+251)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fan, setFan] = useState(''); // Exactly 16 digits string
  const [fin, setFin] = useState(''); // Exactly 12 digits string
  const [role, setRole] = useState<UserRole>('BUSINESS_OWNER');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Step 2: OTP State
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [maskedPhonePreview, setMaskedPhonePreview] = useState('');
  const [maskedFanPreview, setMaskedFanPreview] = useState('');

  // Status & Error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validation
  const cleanFan = fan.replace(/\D/g, '');
  const cleanFin = fin.replace(/\D/g, '');
  const isFanValid = cleanFan.length === 16;
  const isFinValid = cleanFin.length === 12;
  const normalizedPhone = normalizeToE164(phoneNumber, selectedCountry.dialCode);
  const isPhoneValid = isValidE164(normalizedPhone);
  const passwordsMatch = password.length >= 8 && password === confirmPassword;

  // Step 1: Initiate Registration
  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your full legal name.');
      return;
    }

    if (!isPhoneValid) {
      setError('Please provide a valid mobile number in international standard format.');
      return;
    }

    if (!isFanValid) {
      setError('FAN (Fayda Account Number) must be exactly 16 numeric digits.');
      return;
    }

    if (!isFinValid) {
      setError('FIN (Fayda Identification Number) must be exactly 12 numeric digits.');
      return;
    }

    if (role === 'SUPER_ADMIN') {
      setError('Super Administrator enrollment cannot be initiated publicly.');
      return;
    }

    if (!businessName.trim()) {
      setError('Company / Business Name is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    if (!consentAccepted) {
      setError('Please review and agree to the Fayda e-ID verification consent.');
      return;
    }

    setIsSubmitting(true);
    try {
      const challenge = await api.initiateRegistration({
        role,
        name: fullName.trim(),
        phoneNumber: normalizedPhone,
        countryDialCode: selectedCountry.dialCode,
        fan: cleanFan,
        fin: cleanFin,
        businessName: businessName.trim(),
        password,
      });

      setChallengeId(challenge.challengeId);
      setMaskedPhonePreview(challenge.maskedPhone);
      setMaskedFanPreview(challenge.maskedFan);
      if (challenge.simulatedCode) {
        setSimulatedCode(challenge.simulatedCode);
        setOtpCode(challenge.simulatedCode); // Pre-fill in dev mode for smooth testing
      }
      setStep('OTP');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identity verification or registration initiation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Complete Registration with OTP
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId || !otpCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const session = await api.completeRegistration(challengeId, otpCode.trim());
      // Logged in
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        <button
          onClick={onClose}
          aria-label="Close registration dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          ✕
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fayda e-ID Verified Enrollment</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create an Account</h2>
          <p className="text-sm text-slate-400 mt-1">
            Enroll with your national e-ID for cryptographically verifiable dispatch operations.
          </p>
        </div>

        {/* Visible Dev Mode Simulation Banner */}
        <div className="mb-5 p-3 rounded-xl bg-sky-950/60 border border-sky-800/60 text-sky-300 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-sky-200">Simulation / Dev Mode Active:</span>
            <span className="text-slate-300 ml-1">
              Fayda verification is executed against synthetic fixtures. Production fails closed without live authority credentials.
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'FORM' ? (
          <form onSubmit={handleInitiate} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Legal Name (as on Fayda e-ID) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Abebe Bikila"
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Mobile Phone with Country Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Mobile Phone Number <span className="text-rose-400">*</span>
                </label>
                {phoneNumber && (
                  <span className={`text-[11px] ${isPhoneValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isPhoneValid ? 'Valid E.164' : 'Incomplete'}
                  </span>
                )}
              </div>
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
                      {c.flag} {c.dialCode} ({c.name})
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
              <p className="text-[11px] text-slate-500 mt-1">
                Standard format: {normalizeToE164(phoneNumber, selectedCountry.dialCode) || '—'}
              </p>
            </div>

            {/* Fayda FAN & FIN Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    FAN (16 digits) <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-[10px] ${cleanFan.length === 16 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {cleanFan.length}/16
                  </span>
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    FIN (12 digits) <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-[10px] ${cleanFin.length === 12 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {cleanFin.length}/12
                  </span>
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
            </div>

            {/* Role Selection (Strictly No Super-Admin) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Operating Role <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('BUSINESS_OWNER')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    role === 'BUSINESS_OWNER'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-emerald-400">Business Owner</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Manage partner & ledger</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('SENDER')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    role === 'SENDER'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-blue-400">Sender Agent</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Create & dispatch items</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('RECEIVER')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    role === 'RECEIVER'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-amber-400">Receiver Agent</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Verify & reconcile</div>
                </button>
              </div>
            </div>

            {/* Business Legal Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Company / Organization Legal Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Apex Precision Logistics Ltd."
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password (min 8 chars) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password <span className="text-rose-400">*</span>
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
            </div>

            {/* Fayda Identity Consent Checkbox */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400 leading-relaxed">
                  I consent to the verification of my Fayda Account Number (FAN) and Identification Number (FIN) with the National ID Authority gateway, and agree to receive SMS verification codes on my mobile phone.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !consentAccepted}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Verifying e-ID & Dispatching OTP...</span>
              ) : (
                <>
                  <span>Verify Identity & Send OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification Dialog */
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Mobile Recipient:</span>
                <span className="font-mono text-white font-semibold">{maskedPhonePreview}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Fayda Identifier:</span>
                <span className="font-mono text-sky-400 font-semibold">{maskedFanPreview}</span>
              </div>

              {simulatedCode && (
                <div className="p-2.5 rounded-lg bg-sky-950/80 border border-sky-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-sky-300 font-medium">Dev Mode OTP:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                    {simulatedCode}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">
                Enter 6-Digit SMS Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
              >
                Back to Details
              </button>
              <button
                type="submit"
                disabled={isSubmitting || otpCode.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Verifying...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800">
          <p className="text-center text-xs text-slate-400">
            Already have an active account?{' '}
            <button
              type="button"
              onClick={onOpenSignIn}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer ml-1"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
