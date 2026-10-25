import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { SUPPORTED_COUNTRIES, normalizeToE164, isValidE164 } from '../../utils/phoneUtils.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'register' | 'forgot' | 'verifyPhone';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { login, register, verifyPhone, user, quickLoginDemoRole } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot' | 'verifyPhone'>(initialMode);

  // Sign In state
  const [signInMode, setSignInMode] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [signInCountry, setSignInCountry] = useState(SUPPORTED_COUNTRIES[0]); // Ethiopia (+251)
  const [signInPhone, setSignInPhone] = useState('911019283');
  const [signInEmail, setSignInEmail] = useState('owner@apexsupply.com');
  const [signInPassword, setSignInPassword] = useState('Password123!');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register state (Step 1 form)
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [regName, setRegName] = useState('');
  const [regCountry, setRegCountry] = useState(SUPPORTED_COUNTRIES[0]);
  const [regPhone, setRegPhone] = useState('');
  const [regFan, setRegFan] = useState(''); // 16 numeric digits string
  const [regFin, setRegFin] = useState(''); // 12 numeric digits string
  const [regBusiness, setRegBusiness] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('BUSINESS_OWNER');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConsent, setRegConsent] = useState(false);

  // Register OTP state (Step 2)
  const [regChallengeId, setRegChallengeId] = useState<string | null>(null);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regSimulatedCode, setRegSimulatedCode] = useState<string | null>(null);
  const [regMaskedPhone, setRegMaskedPhone] = useState('');
  const [regMaskedFan, setRegMaskedFan] = useState('');

  // Forgot password state (2-step Identity + OTP)
  const [forgotStep, setForgotStep] = useState<'IDENTITY' | 'OTP'>('IDENTITY');
  const [forgotCountry, setForgotCountry] = useState(SUPPORTED_COUNTRIES[0]);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotFan, setForgotFan] = useState('');
  const [forgotFin, setForgotFin] = useState('');
  const [forgotChallengeId, setForgotChallengeId] = useState<string | null>(null);
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotSimulatedCode, setForgotSimulatedCode] = useState<string | null>(null);
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Legacy Phone verification state
  const [phoneCode, setPhoneCode] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Sign In (Mobile default or Email)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    let identifier = '';
    if (signInMode === 'MOBILE') {
      if (!signInPhone.trim()) {
        setErrorMessage('Please enter your mobile phone number.');
        return;
      }
      identifier = normalizeToE164(signInPhone, signInCountry.dialCode);
    } else {
      if (!signInEmail.trim() || !signInEmail.includes('@')) {
        setErrorMessage('Please enter a valid work email address.');
        return;
      }
      identifier = signInEmail.trim();
    }

    if (!signInPassword) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, signInPassword);
      setSuccessMessage('Successfully signed in.');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration Step 1: Initiate with Fayda e-ID Verification
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanFan = regFan.replace(/\D/g, '');
    const cleanFin = regFin.replace(/\D/g, '');
    const normPhone = normalizeToE164(regPhone, regCountry.dialCode);

    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMessage('Please provide your full legal name.');
      return;
    }
    if (!isValidE164(normPhone)) {
      setErrorMessage('Please provide a valid mobile number in international standard format.');
      return;
    }
    if (cleanFan.length !== 16) {
      setErrorMessage('FAN (Fayda Account Number) must be exactly 16 numeric digits.');
      return;
    }
    if (cleanFin.length !== 12) {
      setErrorMessage('FIN (Fayda Identification Number) must be exactly 12 numeric digits.');
      return;
    }
    if (regRole === 'SUPER_ADMIN') {
      setErrorMessage('Super Administrator enrollment cannot be initiated publicly.');
      return;
    }
    if (!regBusiness.trim()) {
      setErrorMessage('Company / Business Name is required.');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!regConsent) {
      setErrorMessage('Please accept the Fayda identity verification consent.');
      return;
    }

    setIsLoading(true);
    try {
      const challenge = await api.initiateRegistration({
        role: regRole,
        name: regName.trim(),
        phoneNumber: normPhone,
        countryDialCode: regCountry.dialCode,
        fan: cleanFan,
        fin: cleanFin,
        businessName: regBusiness.trim(),
        password: regPassword,
      });

      setRegChallengeId(challenge.challengeId);
      setRegMaskedPhone(challenge.maskedPhone);
      setRegMaskedFan(challenge.maskedFan);
      if (challenge.simulatedCode) {
        setRegSimulatedCode(challenge.simulatedCode);
        setRegOtpCode(challenge.simulatedCode);
      }
      setRegStep('OTP');
      setSuccessMessage('Fayda identity verified! Verification code dispatched to your mobile phone.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Identity verification or registration initiation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration Step 2: Complete with OTP
  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regChallengeId || !regOtpCode.trim() || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await api.completeRegistration(regChallengeId, regOtpCode.trim());
      setSuccessMessage('Enrollment complete! Welcome to DispatchBridge.');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Step 1: Initiate
  const handleInitiateForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanFan = forgotFan.replace(/\D/g, '');
    const cleanFin = forgotFin.replace(/\D/g, '');
    const normPhone = normalizeToE164(forgotPhone, forgotCountry.dialCode);

    if (!forgotPhone.trim() || !isValidE164(normPhone)) {
      setErrorMessage('Please provide a valid registered mobile number.');
      return;
    }
    if (cleanFan.length !== 16) {
      setErrorMessage('FAN must be exactly 16 numeric digits.');
      return;
    }
    if (cleanFin.length !== 12) {
      setErrorMessage('FIN must be exactly 12 numeric digits.');
      return;
    }

    setIsLoading(true);
    try {
      const challenge = await api.initiateIdentityPasswordReset({
        phoneNumber: normPhone,
        fan: cleanFan,
        fin: cleanFin,
      });

      setForgotChallengeId(challenge.challengeId);
      setForgotMaskedPhone(challenge.maskedPhone);
      if (challenge.simulatedCode) {
        setForgotSimulatedCode(challenge.simulatedCode);
        setForgotOtpCode(challenge.simulatedCode);
      }
      setForgotStep('OTP');
      setSuccessMessage('Identity verified. An OTP code has been sent to your bound mobile phone.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Identity verification failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Step 2: Complete
  const handleCompleteForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotChallengeId || !forgotOtpCode.trim() || isLoading) return;

    setErrorMessage(null);
    if (forgotNewPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.completeIdentityPasswordReset(
        forgotChallengeId,
        forgotOtpCode.trim(),
        forgotNewPassword
      );
      setSuccessMessage(res.message || 'Password reset successfully! You can now sign in.');
      setTimeout(() => {
        setMode('signin');
        setForgotStep('IDENTITY');
        setForgotChallengeId(null);
        setForgotOtpCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password recovery failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await verifyPhone(phoneCode.trim());
      setSuccessMessage('Phone number verified successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await quickLoginDemoRole(role);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Role switch failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-auto text-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Headers */}
        {mode !== 'verifyPhone' && mode !== 'forgot' && (
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setRegStep('FORM');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Enroll with Fayda e-ID
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* SIGN IN FORM (Mobile Default) */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Toggle between Mobile Number & Work Email */}
            <div className="flex rounded-xl bg-slate-950 p-1 mb-2 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSignInMode('MOBILE');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  signInMode === 'MOBILE'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Number</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInMode('EMAIL');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  signInMode === 'EMAIL'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Work Email</span>
              </button>
            </div>

            {signInMode === 'MOBILE' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Phone Number <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Country dial code"
                    value={signInCountry.code}
                    onChange={(e) => {
                      const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) setSignInCountry(found);
                    }}
                    className="bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                        {c.flag} {c.dialCode}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={signInPhone}
                      onChange={(e) => setSignInPhone(e.target.value)}
                      placeholder={signInCountry.samplePlaceholder}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  E.164: {normalizeToE164(signInPhone, signInCountry.dialCode) || '—'}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotStep('IDENTITY');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                  aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick pre-fill for sandbox test accounts */}
            <div className="pt-4 border-t border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Sandbox Test Roles:</span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('BUSINESS_OWNER')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
                >
                  Owner (Eleanor)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('SENDER')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-blue-300 border border-slate-700 cursor-pointer"
                >
                  Sender (Carlos)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('RECEIVER')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
                >
                  Receiver (David)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoRole('SUPER_ADMIN')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-slate-700 cursor-pointer"
                >
                  Super Admin
                </button>
              </div>
            </div>
          </form>
        )}

        {/* REGISTRATION WITH FAYDA E-ID */}
        {mode === 'register' && (
          <>
            {/* Simulation label badge */}
            <div className="mb-4 p-2.5 rounded-xl bg-sky-950/70 border border-sky-800/70 text-sky-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Fayda e-ID Gateway Simulator Active (Dev Mode)</span>
            </div>

            {regStep === 'FORM' ? (
              <form onSubmit={handleInitiateRegister} className="space-y-3">
                {/* Full Legal Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Legal Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Abebe Bikila"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label="Country dial code"
                      value={regCountry.code}
                      onChange={(e) => {
                        const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                        if (found) setRegCountry(found);
                      }}
                      className="bg-slate-950/80 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                          {c.flag} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder={regCountry.samplePlaceholder}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* FAN & FIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      FAN (16 digits) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="w-3.5 h-3.5 text-sky-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        required
                        maxLength={16}
                        value={regFan}
                        onChange={(e) => setRegFan(e.target.value.replace(/\D/g, ''))}
                        placeholder="16 numeric digits"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-2 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      FIN (12 digits) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        required
                        maxLength={12}
                        value={regFin}
                        onChange={(e) => setRegFin(e.target.value.replace(/\D/g, ''))}
                        placeholder="12 numeric digits"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-2 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Role (No Super-Admin) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Operating Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="BUSINESS_OWNER">Business Owner (Full management & reports)</option>
                    <option value="SENDER">Dispatcher / Sender (Create & send dispatches)</option>
                    <option value="RECEIVER">Receiver / Partner (Acknowledge & reconcile deliveries)</option>
                  </select>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company / Organization Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={regBusiness}
                      onChange={(e) => setRegBusiness(e.target.value)}
                      placeholder="e.g. Apex Supply Freight Ltd"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password (min 8)</label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Consent */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600"
                    />
                    <span>
                      I consent to e-ID validation against the national registry and agree to receive single-use SMS codes on my verified mobile number.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !regConsent}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying e-ID & Dispatching OTP...' : 'Verify Identity & Send OTP'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Registration Step 2: OTP Verification */
              <form onSubmit={handleCompleteRegister} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recipient Phone:</span>
                    <span className="font-mono text-white font-semibold">{regMaskedPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Masked FAN:</span>
                    <span className="font-mono text-sky-300 font-semibold">{regMaskedFan}</span>
                  </div>
                  {regSimulatedCode && (
                    <div className="p-2 rounded bg-sky-950/80 border border-sky-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-sky-300">Dev Simulated OTP:</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                        {regSimulatedCode}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                    Enter 6-Digit SMS Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={regOtpCode}
                    onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full tracking-widest text-center text-xl font-mono bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegStep('FORM')}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || regOtpCode.length < 6}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying...' : 'Complete Enrollment'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* FORGOT PASSWORD WITH FAYDA + OTP */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Identity-Protected Account Recovery</h3>
            </div>
            <p className="text-xs text-slate-400">
              Verify your registered phone number, FAN, and FIN to dispatch a password recovery OTP code.
            </p>

            {forgotStep === 'IDENTITY' ? (
              <form onSubmit={handleInitiateForgot} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Registered Mobile Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label="Country dial code"
                      value={forgotCountry.code}
                      onChange={(e) => {
                        const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                        if (found) setForgotCountry(found);
                      }}
                      className="bg-slate-950/80 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                          {c.flag} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      required
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      placeholder={forgotCountry.samplePlaceholder}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    FAN (16 digits) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={forgotFan}
                    onChange={(e) => setForgotFan(e.target.value.replace(/\D/g, ''))}
                    placeholder="16 numeric digits"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    FIN (12 digits) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={forgotFin}
                    onChange={(e) => setForgotFin(e.target.value.replace(/\D/g, ''))}
                    placeholder="12 numeric digits"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  {isLoading ? 'Verifying Identity...' : 'Send Recovery OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white underline block text-center mt-2 cursor-pointer"
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteForgot} className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recovery Phone:</span>
                    <span className="font-mono text-white">{forgotMaskedPhone}</span>
                  </div>
                  {forgotSimulatedCode && (
                    <div className="p-2 rounded bg-sky-950/80 border border-sky-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-sky-300">Dev Simulated OTP:</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                        {forgotSimulatedCode}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">6-Digit Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtpCode}
                    onChange={(e) => setForgotOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full tracking-widest text-center text-lg font-mono bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Password (min 8)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('IDENTITY')}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || forgotOtpCode.length < 6 || forgotNewPassword.length < 8}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Updating...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* PHONE VERIFICATION MODAL / FORM */}
        {mode === 'verifyPhone' && (
          <form onSubmit={handleVerifyPhoneLegacy} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Verify Phone Number</h3>
            </div>
            <p className="text-xs text-slate-400">
              Enter the 6-digit verification code sent to your phone number.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="123456"
                className="w-full tracking-widest text-center text-lg font-mono bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneCode.length < 6}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              {isLoading ? 'Verifying...' : 'Verify Phone & Continue'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white underline block text-center mt-2 cursor-pointer"
            >
              Skip verification for now
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
